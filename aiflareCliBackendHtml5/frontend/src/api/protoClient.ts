import type {
  BootstrapState,
  CliSummary,
  SessionId,
  SessionEvent,
  SessionSummary,
} from "@aiflare/protocol";
import type { AuthStatus } from "../types/auth.js";

export type SessionEventPayload =
  | {
      type: "session_events_appended";
      sessionId: SessionId;
      events: Array<SessionEvent>;
      summary?: SessionSummary;
    };

export class ProtoClient {
  constructor(private readonly baseUrl: string) {}

  async fetchBootstrap(): Promise<BootstrapState> {
    const response = await fetch(new URL("/api/bootstrap", this.baseUrl));
    if (!response.ok) {
      throw new Error("Failed to fetch bootstrap data");
    }
    return response.json();
  }

  async pairCli(): Promise<{ cliId: string; token: string }> {
    const response = await fetch(new URL("/api/clis/pairing", this.baseUrl), {
      method: "POST",
    });
    if (!response.ok) {
      throw new Error("Failed to pair CLI");
    }
    return response.json();
  }

  async createSession(params: {
    cliId: string;
    workdir: string;
    model: string;
  }): Promise<{ sessionId: string }> {
    const response = await fetch(new URL("/api/sessions", this.baseUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      throw new Error("Failed to create session");
    }
    return response.json();
  }

  async enqueueSampleAction(cliId: string, sessionId?: string): Promise<{ actionId: string }> {
    const response = await fetch(new URL(`/api/clis/${cliId}/actions`, this.baseUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId, type: "noop" }),
    });
    if (!response.ok) {
      throw new Error("Failed to enqueue action");
    }
    return response.json();
  }

  async fetchSessionTimeline(sessionId: SessionId): Promise<Array<SessionEvent>> {
    const response = await fetch(
      new URL(`/api/sessions/${sessionId}/timeline`, this.baseUrl),
    );
    if (!response.ok) {
      throw new Error("Failed to load session timeline");
    }
    return (await response.json()).timeline;
  }

  async sendSessionPrompt(
    sessionId: SessionId,
    content: string,
  ): Promise<{ reply: string; timeline: Array<SessionEvent> }> {
    const response = await fetch(new URL(`/api/sessions/${sessionId}/timeline`, this.baseUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!response.ok) {
      throw new Error(`Failed to send message for session ${sessionId}`);
    }
    return response.json();
  }

  subscribeSessionEvents(onEvent: (event: SessionEventPayload) => void): () => void {
    const url = new URL("/api/session-events", this.baseUrl);
    const source = new EventSource(url.toString());
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as SessionEventPayload;
        onEvent(payload);
      } catch (error) {
        console.error("[proto-client] failed to parse session event", error);
      }
    };
    source.onerror = (event) => {
      console.warn("[proto-client] session event stream error", event);
    };
    return () => {
      source.close();
    };
  }

  async fetchAuthStatus(): Promise<AuthStatus> {
    const response = await fetch(new URL("/api/auth/status", this.baseUrl));
    if (!response.ok) {
      throw new Error("Failed to fetch auth status");
    }
    return response.json();
  }

  async requestLogin(cliId: string): Promise<void> {
    const response = await fetch(new URL("/api/auth/login", this.baseUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cliId }),
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(
        response.status === 409
          ? "Login already pending for this CLI"
          : `Failed to start login (${message || response.status})`,
      );
    }
  }

  async logout(): Promise<void> {
    const response = await fetch(new URL("/api/auth/logout", this.baseUrl), {
      method: "POST",
    });
    if (!response.ok) {
      throw new Error("Failed to logout");
    }
  }
}
