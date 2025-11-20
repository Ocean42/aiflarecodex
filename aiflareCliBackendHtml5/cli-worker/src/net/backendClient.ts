export class BackendClient {
  constructor(
    private readonly baseUrl: string,
    private readonly cliId: string,
  ) {}

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
    );
    if (!response.ok) {
      throw new Error(`Failed to list actions: ${response.statusText}`);
    }
    return (await response.json()).actions ?? [];
  }

  async acknowledgeAction(actionId: string): Promise<void> {
    const response = await fetch(
      new URL(`/api/clis/${this.cliId}/actions/${actionId}/ack`, this.baseUrl),
      { method: "POST" },
    );
    if (!response.ok) {
      throw new Error(`Failed to acknowledge action ${actionId}`);
    }
  }
}
