import { describe, it, expect } from "vitest";
import type { SessionSummary } from "@aiflare/protocol";
import { SessionStore } from "../src/services/sessionStore.js";
import { SessionRunnerService } from "../src/services/sessionRunner.js";

describe("SessionRunnerService", () => {
  it("processes prompts serially and appends timeline entries", async () => {
    const store = new SessionStore({ maxEvents: 10 });
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
    const runner = new SessionRunnerService(store, () => ({
      async runPrompt(prompt: string): Promise<string> {
        if (prompt.includes("hallo")) {
          return "Hallo";
        }
        return summary.id;
      },
    }));

    const first = runner.submitPrompt(summary.id, "hi ai antworte mir bitte mit hallo");
    const second = runner.submitPrompt(summary.id, "Welche Session?");

    const firstResult = await first;
    const secondResult = await second;

    expect(firstResult.reply).toBe("Hallo");
    expect(secondResult.reply).toBe("sess_runner");

    const timeline = store.getTimeline(summary.id);
    const messageEvents = timeline.filter((event) => event.type === "message");
    expect(messageEvents).toHaveLength(4); // user+assistant for both prompts
    const roles = messageEvents.map((event) => event.role);
    expect(roles.filter((role) => role === "user")).toHaveLength(2);
    expect(roles.filter((role) => role === "assistant")).toHaveLength(2);
  });
});
