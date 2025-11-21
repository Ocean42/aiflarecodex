import type {
  BootstrapState,
  CliId,
  CliSummary,
  SessionId,
  SessionMessage,
  SessionSummary,
} from "@aiflare/protocol";
import {
  recordSessionMessageUpdate,
  resetSessionMessageUpdates,
} from "./sessionUpdateTracker.js";

type Listener = () => void;

export class AppState {
  readonly clis = new Map<CliId, CliSummary>();
  readonly sessions = new Map<SessionId, SessionSummary>();
  readonly actions: Array<{ actionId: string; cliId: CliId; sessionId?: SessionId; payload: unknown }> = [];
  readonly sessionMessages = new Map<SessionId, Array<SessionMessage>>();
  readonly openSessionIds: Array<SessionId> = [];
  private readonly listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  updateCli(summary: CliSummary): void {
    this.clis.set(summary.id, summary);
    this.notify();
  }

  updateSession(summary: SessionSummary): void {
    this.sessions.set(summary.id, summary);
    this.notify();
  }

  setActions(actions: Array<{ actionId: string; cliId: CliId; sessionId?: SessionId; payload: unknown }>): void {
    this.actions.splice(0, this.actions.length, ...actions);
    this.notify();
  }

  setSessionMessages(sessionId: SessionId, messages: Array<SessionMessage>): void {
    this.sessionMessages.set(sessionId, messages);
    this.notify();
  }

  appendSessionMessages(sessionId: SessionId, newMessages: Array<SessionMessage>): void {
    if (newMessages.length === 0) {
      return;
    }
    const existing = this.sessionMessages.get(sessionId) ?? [];
    this.sessionMessages.set(sessionId, [...existing, ...newMessages]);
    if (newMessages.some((message) => message.role === "assistant")) {
      recordSessionMessageUpdate(sessionId);
    }
    this.notify();
  }

  updateSessionMessage(sessionId: SessionId, message: SessionMessage): void {
    const existing = this.sessionMessages.get(sessionId);
    if (!existing) {
      return;
    }
    const index = existing.findIndex((entry) => entry.id === message.id);
    if (index === -1) {
      return;
    }
    const updated = existing.slice();
    updated[index] = message;
    this.sessionMessages.set(sessionId, updated);
    if (message.role === "assistant") {
      recordSessionMessageUpdate(sessionId);
    }
    this.notify();
  }

  openSession(sessionId: SessionId): void {
    if (!this.sessions.has(sessionId)) {
      return;
    }
    if (!this.openSessionIds.includes(sessionId)) {
      this.openSessionIds.push(sessionId);
      this.notify();
    }
  }

  closeSession(sessionId: SessionId): void {
    const index = this.openSessionIds.indexOf(sessionId);
    if (index === -1) {
      return;
    }
    this.openSessionIds.splice(index, 1);
    this.notify();
  }

  setBootstrap(state: BootstrapState): void {
    const previouslyOpen = new Set(this.openSessionIds);
    this.clis.clear();
    state.clis.forEach((cli) => this.clis.set(cli.id, cli));
    this.sessions.clear();
    state.sessions.forEach((session) => this.sessions.set(session.id, session));
    this.actions.splice(0, this.actions.length, ...state.actions);
    this.sessionMessages.clear();
    state.sessions.forEach((session) => {
      const messages = state.transcripts[session.id] ?? [];
      this.sessionMessages.set(session.id, messages);
      resetSessionMessageUpdates(session.id);
    });
    this.openSessionIds.splice(0, this.openSessionIds.length);
    for (const sessionId of previouslyOpen) {
      if (this.sessions.has(sessionId)) {
        this.openSessionIds.push(sessionId);
      }
    }
    if (this.openSessionIds.length === 0 && state.sessions.length > 0) {
      this.openSessionIds.push(state.sessions[0]!.id);
    }
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const appState = new AppState();
