import type {
  BootstrapState,
  CliId,
  CliSummary,
  SessionId,
  SessionMessage,
  SessionSummary,
} from "@aiflare/protocol";

type Listener = () => void;

export class AppState {
  readonly clis = new Map<CliId, CliSummary>();
  readonly sessions = new Map<SessionId, SessionSummary>();
  readonly actions: Array<{ actionId: string; cliId: CliId; sessionId?: SessionId; payload: unknown }> = [];
  readonly sessionMessages = new Map<SessionId, Array<SessionMessage>>();
  activeSessionId: SessionId | null = null;
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
    this.notify();
  }

  setActiveSession(sessionId: SessionId | null): void {
    this.activeSessionId = sessionId;
    this.notify();
  }

  setBootstrap(state: BootstrapState): void {
    this.clis.clear();
    state.clis.forEach((cli) => this.clis.set(cli.id, cli));
    this.sessions.clear();
    state.sessions.forEach((session) => this.sessions.set(session.id, session));
    this.actions.splice(0, this.actions.length, ...state.actions);
    this.sessionMessages.clear();
    state.sessions.forEach((session) => {
      const messages = state.transcripts[session.id] ?? [];
      this.sessionMessages.set(session.id, messages);
    });
    if (!this.activeSessionId || !this.sessions.has(this.activeSessionId)) {
      this.activeSessionId = state.sessions[0]?.id ?? null;
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
