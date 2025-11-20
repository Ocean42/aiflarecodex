import { describe, it, expect } from "vitest";
import type { SessionSummary } from "@aiflare/protocol";
import { SessionStore } from "../src/services/sessionStore.js";
import { SessionRunnerService } from "../src/services/sessionRunner.js";
import { createLegacyRuntimeFactory } from "../src/utils/agent/runtime.js";
import { SessionAgentService } from "../src/services/sessionAgent.js";

describe("SessionRunnerService", () => {
  it("processes prompts serially and appends transcript entries", async () => {
    const store = new SessionStore({ maxMessages: 10 });
    const summary: SessionSummary = {
      id: "sess_runner",
      cliId: "cli_a",
      model: "gpt-test",
      workdir: "/tmp/project-a",
      status: "waiting",
      lastUpdated: new Date().toISOString(),
      title: "Runner Session",
    };
    store.createSession(summary);
    const runner = new SessionRunnerService(
      store,
      createLegacyRuntimeFactory(new SessionAgentService()),
    );

    const first = runner.submitPrompt(summary.id, "hi ai antworte mir bitte mit hallo");
    const second = runner.submitPrompt(summary.id, "Welche Session?");

    const firstResult = await first;
    const secondResult = await second;

    expect(firstResult.reply).toBe("Hallo");
    expect(secondResult.reply).toBe("sess_runner");

    const messages = store.getMessages(summary.id);
    expect(messages).toHaveLength(4); // user+assistant for both prompts
    expect(messages[0]).toMatchObject({ role: "user", content: expect.stringContaining("hi ai") });
    expect(messages[1]).toMatchObject({ role: "assistant", content: "Hallo" });
    expect(messages[3]).toMatchObject({ role: "assistant", content: "sess_runner" });
  });
});
