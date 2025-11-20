type PendingEntry = {
  resolve: (outputs: Array<unknown>) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
};

export class ToolResultBroker {
  private readonly pending = new Map<string, PendingEntry>();

  waitForResult(
    callId: string,
    timeoutMs = 30_000,
  ): Promise<Array<unknown>> {
    if (this.pending.has(callId)) {
      throw new Error(`Tool call ${callId} already pending`);
    }
    return new Promise<Array<unknown>>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(callId);
        reject(new Error(`Tool call ${callId} timed out`));
      }, timeoutMs);
      this.pending.set(callId, {
        resolve: (items) => {
          clearTimeout(timeout);
          resolve(items);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
        timeout,
      });
    });
  }

  resolve(callId: string, outputs: Array<unknown>): boolean {
    const entry = this.pending.get(callId);
    if (!entry) {
      return false;
    }
    this.pending.delete(callId);
    entry.resolve(outputs);
    return true;
  }

  reject(callId: string, error: Error): boolean {
    const entry = this.pending.get(callId);
    if (!entry) {
      return false;
    }
    this.pending.delete(callId);
    entry.reject(error);
    return true;
  }
}
