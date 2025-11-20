import type { SessionId } from "@aiflare/protocol";

export type ActiveSessionListener = (payload: {
  context: string;
  sessionId: SessionId | null;
}) => void;

export class ActiveSessionRegistry {
  private readonly defaultContext: string;
  private readonly contextMap = new Map<string, SessionId | null>();
  private readonly listeners = new Set<ActiveSessionListener>();

  constructor(defaultContext = "global") {
    this.defaultContext = defaultContext;
    this.contextMap.set(this.defaultContext, null);
  }

  setActiveSession(
    sessionId: SessionId | null,
    context = this.defaultContext,
  ): void {
    const previous = this.contextMap.get(context) ?? null;
    if (previous === sessionId) {
      return;
    }
    this.contextMap.set(context, sessionId);
    this.notify({ context, sessionId });
  }

  getActiveSession(context = this.defaultContext): SessionId | null {
    return this.contextMap.get(context) ?? null;
  }

  subscribe(listener: ActiveSessionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  listContexts(): Array<{ context: string; sessionId: SessionId | null }> {
    return Array.from(this.contextMap.entries()).map(([context, sessionId]) => ({
      context,
      sessionId: sessionId ?? null,
    }));
  }

  private notify(payload: {
    context: string;
    sessionId: SessionId | null;
  }): void {
    for (const listener of this.listeners) {
      listener(payload);
    }
  }
}
