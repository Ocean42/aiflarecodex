import { mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type {
  SessionEvent,
  SessionId,
  SessionMessageContentSegment,
  SessionMessageEvent,
  SessionSummary,
} from "@aiflare/protocol";

export type SessionStoreEvent =
  | {
      type: "session_summary_updated";
      sessionId: SessionId;
      summary: SessionSummary;
    }
  | {
      type: "session_events_appended";
      sessionId: SessionId;
      events: Array<SessionEvent>;
    };

export interface SessionStoreOptions {
  persistDir?: string;
  maxEvents?: number;
}

type NormalizedSessionStoreOptions = {
  maxEvents: number;
  persistDir?: string;
};

type SessionSnapshot = {
  version: 2;
  summary: SessionSummary;
  timeline: Array<SessionEvent>;
};

export type SessionEventDraft = Omit<SessionEvent, "sessionId" | "createdAt"> & {
  id?: string;
  createdAt?: string;
};

const DEFAULT_MAX_EVENTS = 1000;

class SessionState {
  private summary: SessionSummary;
  private readonly options: NormalizedSessionStoreOptions;
  private timeline: Array<SessionEvent>;

  constructor(
    summary: SessionSummary,
    options: NormalizedSessionStoreOptions,
    snapshot?: SessionSnapshot,
  ) {
    this.summary = summary;
    this.options = options;
    this.timeline =
      snapshot?.timeline?.slice(-this.options.maxEvents) ?? [];
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

  appendMessage(
    role: SessionMessageEvent["role"],
    content: string,
    options?: {
      id?: string;
      segments?: Array<SessionMessageContentSegment>;
      state?: SessionMessageEvent["state"];
      metadata?: Record<string, unknown>;
    },
  ): SessionMessageEvent {
    const segments = options?.segments ?? [{ type: "text", text: content }];
    const [event] = this.appendEvents([
      {
        type: "message",
        role,
        content: segments,
        metadata: options?.metadata,
        state: options?.state,
        id: options?.id,
      },
    ]) as Array<SessionMessageEvent>;
    return event;
  }

  appendEvents(drafts: Array<SessionEventDraft>): Array<SessionEvent> {
    if (drafts.length === 0) {
      return [];
    }
    const applied: Array<SessionEvent> = [];
    for (const draft of drafts) {
      const normalized = this.normalizeEvent(draft);
      const existingIndex = this.timeline.findIndex(
        (entry) => entry.id === normalized.id,
      );
      if (existingIndex >= 0) {
        const current = this.timeline[existingIndex]!;
        const merged = {
          ...normalized,
          createdAt: draft.createdAt ?? current.createdAt,
        } as SessionEvent;
        this.timeline[existingIndex] = merged;
        applied.push(merged);
      } else {
        this.timeline.push(normalized);
        applied.push(normalized);
      }
    }
    this.timeline.sort((a, b) => {
      const cmp = a.createdAt.localeCompare(b.createdAt);
      if (cmp !== 0) {
        return cmp;
      }
      return a.id.localeCompare(b.id);
    });
    if (this.timeline.length > this.options.maxEvents) {
      this.timeline = this.timeline.slice(-this.options.maxEvents);
    }
    this.persist();
    return applied.map((event) => ({ ...event }));
  }

  getTimeline(): Array<SessionEvent> {
    return this.timeline.slice();
  }

  private normalizeEvent(draft: SessionEventDraft): SessionEvent {
    const id = draft.id ?? `evt_${randomUUID()}`;
    const createdAt = draft.createdAt ?? new Date().toISOString();
    return {
      ...draft,
      id,
      sessionId: this.summary.id,
      createdAt,
    } as SessionEvent;
  }

  persist(): void {
    if (!this.options.persistDir) {
      return;
    }
    const payload: SessionSnapshot = {
      version: 2,
      summary: this.summary,
      timeline: this.timeline,
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
      maxEvents: options?.maxEvents ?? DEFAULT_MAX_EVENTS,
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
    role: SessionMessageEvent["role"],
    content: string,
    options?: {
      id?: string;
      segments?: Array<SessionMessageContentSegment>;
      state?: SessionMessageEvent["state"];
      metadata?: Record<string, unknown>;
    },
  ): SessionMessageEvent {
    const session = this.requireSession(sessionId);
    const message = session.appendMessage(role, content, options);
    this.emit({
      type: "session_events_appended",
      sessionId,
      events: [message],
    });
    return message;
  }

  upsertAssistantMessage(
    sessionId: SessionId,
    externalId: string,
    content: string,
    options?: {
      segments?: Array<SessionMessageContentSegment>;
      state?: SessionMessageEvent["state"];
      metadata?: Record<string, unknown>;
    },
  ): SessionMessageEvent {
    const session = this.requireSession(sessionId);
    const event = session.appendEvents([
      {
        type: "message",
        role: "assistant",
        content: options?.segments ?? [{ type: "text", text: content }],
        state: options?.state,
        metadata: options?.metadata,
        id: externalId,
      },
    ])[0] as SessionMessageEvent;
    this.emit({
      type: "session_events_appended",
      sessionId,
      events: [event],
    });
    return event;
  }

  appendTimelineEvents(
    sessionId: SessionId,
    drafts: Array<SessionEventDraft>,
  ): Array<SessionEvent> {
    const session = this.requireSession(sessionId);
    const events = session.appendEvents(drafts);
    if (events.length > 0) {
      this.emit({
        type: "session_events_appended",
        sessionId,
        events,
      });
    }
    return events;
  }

  getTimeline(sessionId: SessionId): Array<SessionEvent> {
    return this.requireSession(sessionId).getTimeline();
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

  subscribe(listener: (event: SessionStoreEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  toTimelineRecord(): Record<SessionId, Array<SessionEvent>> {
    const record: Record<SessionId, Array<SessionEvent>> = {};
    for (const [sessionId, state] of this.sessions.entries()) {
      record[sessionId] = state.getTimeline();
    }
    return record;
  }

  reset(): void {
    this.sessions.clear();
    if (this.options.persistDir) {
      try {
        rmSync(this.options.persistDir, { recursive: true, force: true });
        mkdirSync(this.options.persistDir, { recursive: true });
      } catch (error) {
        console.warn(
          "[session-store] failed to reset persisted sessions",
          error instanceof Error ? error.message : error,
        );
      }
    }
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
        if (!snapshot?.summary?.id || snapshot.version !== 2) {
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
