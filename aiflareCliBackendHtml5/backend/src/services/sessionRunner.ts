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
  private readonly runtime: SessionRuntime;

  constructor(
    private readonly sessionId: SessionId,
    private readonly store: SessionStore,
    runtimeFactory: SessionRuntimeFactory,
  ) {
    this.runtime = runtimeFactory(sessionId);
  }

  submitPrompt(prompt: string): Promise<{ reply: string }> {
    return new Promise((resolve, reject) => {
      this.queue.push({ prompt, resolve, reject });
      void this.process();
    });
  }

  dispose(): void {
    this.runtime.dispose?.();
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
      try {
        await this.runSinglePrompt(item);
      } catch (error) {
        const err =
          error instanceof Error ? error : new Error(String(error));
        item.reject(err);
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
    const userMessage = this.store.appendMessage(
      this.sessionId,
      "user",
      item.prompt,
    );
    this.store.appendEvent(this.sessionId, "user_message_appended", {
      messageId: userMessage.id,
    });
    try {
      const reply = await this.runtime.runPrompt(item.prompt);
      const assistantMessage = this.store.appendMessage(
        this.sessionId,
        "assistant",
        reply,
      );
      this.store.appendEvent(this.sessionId, "assistant_message_appended", {
        messageId: assistantMessage.id,
      });
      this.store.appendEvent(this.sessionId, "message_exchange_completed", {
        userMessageId: userMessage.id,
        assistantMessageId: assistantMessage.id,
      });
      item.resolve({ reply });
    } finally {
      this.store.updateSummary(this.sessionId, { status: "waiting" });
    }
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

  reset(sessionId: SessionId): void {
    const runner = this.runners.get(sessionId);
    if (runner) {
      runner.dispose();
      this.runners.delete(sessionId);
    }
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
