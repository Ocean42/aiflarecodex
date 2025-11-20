export class BackendClient {
  constructor(
    private readonly baseUrl: string,
    private readonly cliId: string,
  ) {}

  private sessionToken: string | null = null;

  setSessionToken(token: string): void {
    this.sessionToken = token;
  }

  private authHeaders(
    extra?: Record<string, string>,
  ): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.sessionToken) {
      headers["x-cli-token"] = this.sessionToken;
    }
    if (extra) {
      for (const [key, value] of Object.entries(extra)) {
        headers[key] = value;
      }
    }
    return headers;
  }

  async register(label: string, token?: string): Promise<{ token: string }> {
    const response = await fetch(new URL("/api/clis/register", this.baseUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cliId: this.cliId, label, token }),
    });
    if (!response.ok) {
      throw new Error(`Failed to register CLI: ${response.status}`);
    }
    return response.json();
  }

  async heartbeat(token: string): Promise<void> {
    const response = await fetch(
      new URL(`/api/clis/${this.cliId}/heartbeat`, this.baseUrl),
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-cli-token": token,
        },
      },
    );
    if (!response.ok) {
      throw new Error(`Heartbeat failed ${response.status}`);
    }
  }

  async listActions(): Promise<Array<{ actionId: string; payload: unknown }>> {
    const response = await fetch(
      new URL(`/api/clis/${this.cliId}/actions`, this.baseUrl),
      { headers: this.authHeaders() },
    );
    if (!response.ok) {
      throw new Error(`Failed to list actions: ${response.statusText}`);
    }
    return (await response.json()).actions ?? [];
  }

  async acknowledgeAction(actionId: string): Promise<void> {
    const response = await fetch(
      new URL(`/api/clis/${this.cliId}/actions/${actionId}/ack`, this.baseUrl),
      { method: "POST", headers: this.authHeaders() },
    );
    if (!response.ok) {
      throw new Error(`Failed to acknowledge action ${actionId}`);
    }
  }

  async uploadAuthData(token: string, authData: unknown): Promise<void> {
    const response = await fetch(
      new URL(`/api/clis/${this.cliId}/auth`, this.baseUrl),
      {
        method: "POST",
        headers: this.authHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({ authData }),
      },
    );
    if (!response.ok) {
      throw new Error(`Failed to upload auth data (${response.status})`);
    }
  }

  async cancelLogin(): Promise<void> {
    if (!this.sessionToken) {
      return;
    }
    const response = await fetch(
      new URL(`/api/clis/${this.cliId}/auth/cancel`, this.baseUrl),
      {
        method: "POST",
        headers: this.authHeaders(),
      },
    );
    if (!response.ok) {
      throw new Error(`Failed to cancel login (${response.status})`);
    }
  }

  async submitToolResult(
    sessionId: string,
    callId: string,
    outputs: Array<unknown>,
  ): Promise<void> {
    const response = await fetch(
      new URL(`/api/clis/${this.cliId}/tool-results`, this.baseUrl),
      {
        method: "POST",
        headers: this.authHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({ sessionId, callId, outputs }),
      },
    );
    if (!response.ok) {
      throw new Error(`Failed to submit tool result (${response.status})`);
    }
  }
}
