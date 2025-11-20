import type {
  CliId,
  CliSummary,
  SessionId,
  SessionSummary,
} from "@aiflare/protocol";

type Listener = () => void;

export class AppState {
  readonly clis = new Map<CliId, CliSummary>();
  readonly sessions = new Map<SessionId, SessionSummary>();
  readonly actions: Array<{ actionId: string; cliId: CliId; sessionId?: SessionId; payload: unknown }> = [];
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

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const appState = new AppState();
