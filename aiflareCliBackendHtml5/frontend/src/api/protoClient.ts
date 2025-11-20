import type { CliSummary, SessionSummary } from "@aiflare/protocol";

export class ProtoClient {
  constructor(private readonly baseUrl: string) {}

  async fetchBootstrap(): Promise<{
    clis: Array<CliSummary>;
    sessions: Array<SessionSummary>;
    actions: Array<{ actionId: string; sessionId?: string; payload: unknown; cliId: string }>;
  }> {
    const [clisResp, sessionsResp, actionsResp] = await Promise.all([
      fetch(new URL("/api/clis", this.baseUrl)),
      fetch(new URL("/api/sessions", this.baseUrl)),
      fetch(new URL("/api/actions", this.baseUrl)),
    ]);
    if (!clisResp.ok || !sessionsResp.ok || !actionsResp.ok) {
      throw new Error("Failed to fetch bootstrap data");
    }
    return {
      clis: (await clisResp.json()).clis,
      sessions: (await sessionsResp.json()).sessions,
      actions: (await actionsResp.json()).actions,
    };
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

  async fetchSessionHistory(sessionId: string): Promise<
    Array<{ timestamp: string; event: string; data?: unknown }>
  > {
    const response = await fetch(
      new URL(`/api/sessions/${sessionId}/history`, this.baseUrl),
    );
    if (!response.ok) {
      throw new Error(`Failed to load history for session ${sessionId}`);
    }
    return (await response.json()).history;
  }
}
