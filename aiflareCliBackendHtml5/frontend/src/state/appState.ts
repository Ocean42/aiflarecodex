import type {
  BootstrapState,
  CliId,
  CliSummary,
  SessionId,
  SessionEvent,
  SessionSummary,
} from "@aiflare/protocol";
import { resetSessionTimelineUpdates } from "./sessionUpdateTracker.js";

type Listener = () => void;

export class AppState {
  readonly clis = new Map<CliId, CliSummary>();
  readonly sessions = new Map<SessionId, SessionSummary>();
  readonly actions: Array<{ actionId: string; cliId: CliId; sessionId?: SessionId; payload: unknown }> = [];
  readonly sessionTimeline = new Map<SessionId, Array<SessionEvent>>();
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

  setSessionTimeline(sessionId: SessionId, events: Array<SessionEvent>): void {
    this.sessionTimeline.set(sessionId, events);
    this.notify();
  }

  appendSessionTimeline(sessionId: SessionId, newEvents: Array<SessionEvent>): void {
    if (newEvents.length === 0) {
      return;
    }
    const existing = this.sessionTimeline.get(sessionId) ?? [];
    const byId = new Map(existing.map((event) => [event.id, event]));
    for (const event of newEvents) {
      byId.set(event.id, event);
    }
    const merged = Array.from(byId.values()).sort((a, b) => {
      const cmp = a.createdAt.localeCompare(b.createdAt);
      if (cmp !== 0) {
        return cmp;
      }
      return a.id.localeCompare(b.id);
    });
    this.sessionTimeline.set(sessionId, merged);
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
    this.sessionTimeline.clear();
    state.sessions.forEach((session) => {
      const events = state.timeline[session.id] ?? [];
      this.sessionTimeline.set(session.id, events);
      resetSessionTimelineUpdates(session.id);
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
