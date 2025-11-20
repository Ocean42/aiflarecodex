import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { SessionId, SessionSummary } from "@aiflare/protocol";

export type SessionMessage = {
  id: string;
  sessionId: SessionId;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
};

export type SessionEvent = {
  timestamp: string;
  event: string;
  data?: unknown;
};

export type PendingUserMessage = {
  id: string;
  content: string;
  timestamp: string;
};

export type AgentItem = {
  id: string;
  [key: string]: unknown;
};

export type SessionStoreEvent =
  | {
      type: "session_summary_updated";
      sessionId: SessionId;
      summary: SessionSummary;
    }
  | {
      type: "session_messages_appended";
      sessionId: SessionId;
      messages: Array<SessionMessage>;
    };

export interface SessionStoreOptions {
  persistDir?: string;
  maxMessages?: number;
}

type NormalizedSessionStoreOptions = {
  maxMessages: number;
  persistDir?: string;
};

type SessionSnapshot = {
  summary: SessionSummary;
  messages?: Array<SessionMessage>;
  events?: Array<SessionEvent>;
  pendingUserMessages?: Array<PendingUserMessage>;
  agentItems?: Array<AgentItem>;
};

const DEFAULT_MAX_MESSAGES = 500;

class SessionState {
  private summary: SessionSummary;
  private readonly options: NormalizedSessionStoreOptions;
  private messages: Array<SessionMessage>;
  private events: Array<SessionEvent>;
  private pendingUserMessages: Array<PendingUserMessage>;
  private agentItems: Array<AgentItem>;

  constructor(
    summary: SessionSummary,
    options: NormalizedSessionStoreOptions,
    snapshot?: SessionSnapshot,
  ) {
    this.summary = summary;
    this.options = options;
    this.messages =
      snapshot?.messages?.slice(-this.options.maxMessages) ?? [];
    this.events = snapshot?.events ?? [];
    this.pendingUserMessages = snapshot?.pendingUserMessages ?? [];
    this.agentItems = snapshot?.agentItems ?? [];
  }

  get id(): SessionId {
    return this.summary.id;
  }

  getSummary(): SessionSummary {
    return this.summary;
  }

  updateSummary(partial: Partial<SessionSummary>): void {
    this.summary = {
      ...this.summary,
      ...partial,
      lastUpdated: partial.lastUpdated ?? new Date().toISOString(),
    };
    this.persist();
  }

  appendMessage(role: SessionMessage["role"], content: string): SessionMessage {
    const message: SessionMessage = {
      id: `msg_${randomUUID()}`,
      sessionId: this.summary.id,
      role,
      content,
      timestamp: new Date().toISOString(),
    };
    this.messages = [...this.messages, message].slice(
      -this.options.maxMessages,
    );
    this.persist();
    return message;
  }

  getMessages(): Array<SessionMessage> {
    return this.messages.slice();
  }

  appendEvent(event: string, data?: unknown): SessionEvent {
    const entry: SessionEvent = {
      timestamp: new Date().toISOString(),
      event,
      data,
    };
    this.events = [...this.events, entry];
    this.persist();
    return entry;
  }

  getEvents(): Array<SessionEvent> {
    return this.events.slice();
  }

  addPendingUserMessage(content: string): PendingUserMessage {
    const entry: PendingUserMessage = {
      id: `pending_${randomUUID()}`,
      content,
      timestamp: new Date().toISOString(),
    };
    this.pendingUserMessages = [...this.pendingUserMessages, entry];
    this.persist();
    return entry;
  }

  resolvePendingUserMessage(pendingId: string): void {
    this.pendingUserMessages = this.pendingUserMessages.filter(
      (entry) => entry.id !== pendingId,
    );
    this.persist();
  }

  getPendingUserMessages(): Array<PendingUserMessage> {
    return this.pendingUserMessages.slice();
  }

  upsertAgentItem(item: AgentItem): void {
    const existingIndex = this.agentItems.findIndex(
      (entry) => entry.id === item.id,
    );
    if (existingIndex >= 0) {
      this.agentItems[existingIndex] = item;
    } else {
      this.agentItems.push(item);
    }
    this.persist();
  }

  getAgentItems(): Array<AgentItem> {
    return this.agentItems.slice();
  }

  persist(): void {
    if (!this.options.persistDir) {
      return;
    }
    const payload: SessionSnapshot = {
      summary: this.summary,
      messages: this.messages,
      events: this.events,
      pendingUserMessages: this.pendingUserMessages,
      agentItems: this.agentItems,
    };
    mkdirSync(this.options.persistDir, { recursive: true });
    const file = join(this.options.persistDir, `${this.summary.id}.json`);
    writeFileSync(file, JSON.stringify(payload, null, 2), "utf-8");
  }
}

export class SessionStore {
  private readonly sessions = new Map<SessionId, SessionState>();
  private readonly options: NormalizedSessionStoreOptions;
  private readonly listeners = new Set<(event: SessionStoreEvent) => void>();

  constructor(options?: SessionStoreOptions) {
    this.options = {
      maxMessages: options?.maxMessages ?? DEFAULT_MAX_MESSAGES,
      persistDir: options?.persistDir,
    };
    if (this.options.persistDir) {
      this.loadPersistedSessions();
    }
  }

  createSession(summary: SessionSummary): SessionState {
    if (this.sessions.has(summary.id)) {
      throw new Error(`Session ${summary.id} already exists`);
    }
    const state = new SessionState(summary, this.options);
    this.sessions.set(summary.id, state);
    this.emit({
      type: "session_summary_updated",
      sessionId: summary.id,
      summary,
    });
    return state;
  }

  get(sessionId: SessionId): SessionState | undefined {
    return this.sessions.get(sessionId);
  }

  listSummaries(): Array<SessionSummary> {
    return Array.from(this.sessions.values()).map((state) =>
      state.getSummary(),
    );
  }

  count(): number {
    return this.sessions.size;
  }

  appendMessage(
    sessionId: SessionId,
    role: SessionMessage["role"],
    content: string,
  ): SessionMessage {
    const session = this.requireSession(sessionId);
    const message = session.appendMessage(role, content);
    this.emit({
      type: "session_messages_appended",
      sessionId,
      messages: [message],
    });
    return message;
  }

  appendEvent(sessionId: SessionId, event: string, data?: unknown): SessionEvent {
    const session = this.requireSession(sessionId);
    return session.appendEvent(event, data);
  }

  updateSummary(
    sessionId: SessionId,
    partial: Partial<SessionSummary>,
  ): SessionSummary {
    const session = this.requireSession(sessionId);
    session.updateSummary(partial);
    const summary = session.getSummary();
    this.emit({
      type: "session_summary_updated",
      sessionId,
      summary,
    });
    return summary;
  }

  getMessages(sessionId: SessionId): Array<SessionMessage> {
    return this.requireSession(sessionId).getMessages();
  }

  getEvents(sessionId: SessionId): Array<SessionEvent> {
    return this.requireSession(sessionId).getEvents();
  }

  toTranscriptRecord(): Record<SessionId, Array<SessionMessage>> {
    const transcripts: Record<SessionId, Array<SessionMessage>> = {};
    for (const [sessionId, state] of this.sessions.entries()) {
      transcripts[sessionId] = state.getMessages();
    }
    return transcripts;
  }

  subscribe(listener: (event: SessionStoreEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(event: SessionStoreEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private loadPersistedSessions(): void {
    try {
      mkdirSync(this.options.persistDir!, { recursive: true });
      const files = readdirSync(this.options.persistDir!).filter((file) =>
        file.endsWith(".json"),
      );
      for (const file of files) {
        const absolute = join(this.options.persistDir!, file);
        const raw = readFileSync(absolute, "utf-8");
        const snapshot = JSON.parse(raw) as SessionSnapshot;
        if (!snapshot?.summary?.id) {
          continue;
        }
        const state = new SessionState(
          snapshot.summary,
          this.options,
          snapshot,
        );
        this.sessions.set(snapshot.summary.id, state);
      }
    } catch (error) {
      console.warn(
        "[session-store] failed to load persisted sessions",
        error instanceof Error ? error.message : error,
      );
    }
  }

  private requireSession(sessionId: SessionId): SessionState {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    return session;
  }
}
