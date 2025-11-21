import { randomUUID } from "node:crypto";
import { BackendCredentials } from "../backend/backend-credentials.js";
import { SessionStore } from "../services/sessionStore.js";
import { SessionRunnerService } from "../services/sessionRunner.js";
import { createAgentLoopRuntimeFactory } from "./agent/runtime.js";
import { createToolExecutorFactory } from "../services/toolExecutorFactory.js";

export class CodexHttpCallHelper {
  static async callCodex(prompt: string): Promise<string> {
    // Ensure auth.json + environment are ready.
    BackendCredentials.ensure();

    const store = new SessionStore({ persistDir: undefined });
    const sessionId = `sess_${randomUUID()}`;
    store.createSession({
      id: sessionId,
      cliId: "codex_helper",
      model: "gpt-4.1-mini",
      workdir: process.cwd(),
      status: "waiting",
      lastUpdated: new Date().toISOString(),
      title: "Codex Helper",
    });

    const toolExecutorFactory = createToolExecutorFactory({ mode: "test" });
    const runtimeFactory = createAgentLoopRuntimeFactory({
      getSessionSummary: (id) => store.get(id)?.getSummary(),
      createToolExecutor: (summary) => toolExecutorFactory(summary),
    });

    const runner = new SessionRunnerService(store, runtimeFactory);
    const result = await runner.submitPrompt(
      sessionId,
      prompt,
    );
    return result.reply;
  }
}
