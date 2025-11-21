import type { SessionId } from "@aiflare/protocol";
import { SessionStore } from "./sessionStore.js";

export interface SessionRuntime {
  runPrompt(prompt: string): Promise<string>;
  dispose?(): void;
}

export type SessionRuntimeFactory = (sessionId: SessionId) => SessionRuntime;

type QueueItem = {
  prompt: string;
  resolve: (result: { reply: string }) => void;
  reject: (error: Error) => void;
};

class SessionRunner {
  private readonly queue: Array<QueueItem> = [];
  private processing = false;
  private readonly activeRuns = new Set<Promise<void>>();
  private disposed = false;
  private readonly runtime: SessionRuntime;

  constructor(
    private readonly sessionId: SessionId,
    private readonly store: SessionStore,
    runtimeFactory: SessionRuntimeFactory,
  ) {
    this.runtime = runtimeFactory(sessionId);
  }

  submitPrompt(prompt: string): Promise<{ reply: string }> {
    if (this.disposed) {
      return Promise.reject<{ reply: string }>(
        new Error(`session ${this.sessionId} is shutting down`),
      );
    }
    return new Promise((resolve, reject) => {
      this.queue.push({ prompt, resolve, reject });
      void this.process();
    });
  }

  async dispose(): Promise<void> {
    if (this.disposed) {
      await this.waitForActiveRuns();
      return;
    }
    this.disposed = true;
    const error = new Error(`session ${this.sessionId} is shutting down`);
    while (this.queue.length > 0) {
      this.queue.shift()?.reject(error);
    }
    this.runtime.dispose?.();
    await this.waitForActiveRuns();
  }

  private async process(): Promise<void> {
    if (this.processing) {
      return;
    }
    this.processing = true;
    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) {
        break;
      }
      let runPromise: Promise<void> | null = null;
      try {
        runPromise = this.runSinglePrompt(item);
        this.activeRuns.add(runPromise);
        await runPromise;
      } catch (error) {
        const err =
          error instanceof Error ? error : new Error(String(error));
        item.reject(err);
      } finally {
        if (runPromise) {
          this.activeRuns.delete(runPromise);
        }
      }
    }
    this.processing = false;
  }

  private async runSinglePrompt(item: QueueItem): Promise<void> {
    const sessionState = this.store.get(this.sessionId);
    if (!sessionState) {
      throw new Error(`session ${this.sessionId} not found`);
    }
    this.store.updateSummary(this.sessionId, { status: "running" });
    this.store.appendMessage(this.sessionId, "user", item.prompt);
    try {
      const reply = await this.runtime.runPrompt(item.prompt);
      this.store.appendMessage(this.sessionId, "assistant", reply);
      item.resolve({ reply });
    } finally {
      this.store.updateSummary(this.sessionId, { status: "waiting" });
    }
  }

  private async waitForActiveRuns(): Promise<void> {
    if (this.activeRuns.size === 0) {
      return;
    }
    await Promise.allSettled(Array.from(this.activeRuns));
    this.activeRuns.clear();
  }
}

export class SessionRunnerService {
  private readonly runners = new Map<SessionId, SessionRunner>();

  constructor(
    private readonly store: SessionStore,
    private readonly runtimeFactory: SessionRuntimeFactory,
  ) {}

  submitPrompt(sessionId: SessionId, prompt: string): Promise<{ reply: string }> {
    const runner = this.ensureRunner(sessionId);
    return runner.submitPrompt(prompt);
  }

  async reset(sessionId: SessionId): Promise<void> {
    const runner = this.runners.get(sessionId);
    if (runner) {
      this.runners.delete(sessionId);
      await runner.dispose();
    }
  }

  async resetAll(): Promise<void> {
    const runners = Array.from(this.runners.values());
    this.runners.clear();
    await Promise.allSettled(runners.map((runner) => runner.dispose()));
  }

  private ensureRunner(sessionId: SessionId): SessionRunner {
    let runner = this.runners.get(sessionId);
    if (!runner) {
      runner = new SessionRunner(sessionId, this.store, this.runtimeFactory);
      this.runners.set(sessionId, runner);
    }
    return runner;
  }
}
