import { describe, it, expect } from "vitest";

import { AgentLoop } from "../src/utils/agent/agent-loop.js";
import { ReviewDecision } from "../src/utils/agent/review.js";
import { getApiKey, loadConfig } from "../src/utils/config.js";

describe("backend integration – agent responses", () => {
  it("runs a simple agent turn against OpenAI Responses when an API key is configured", async () => {
    const config = loadConfig();
    const provider = config.provider ?? "openai";

    // If no API key is configured we cannot talk to the real backend.
    // In that case we turn this into a no-op so CI environments without
    // credentials do not fail.
    if (!getApiKey(provider)) {
      expect(getApiKey(provider)).toBeUndefined();
      return;
    }

    const received: Array<any> = [];

    const agent = new AgentLoop({
      model: config.model,
      provider,
      instructions:
        "You are a test harness. Reply to the user with a short textual confirmation. Do not call tools or run commands.",
      approvalPolicy: "suggest",
      disableResponseStorage: true,
      config,
      additionalWritableRoots: [],
      onItem: (item) => {
        received.push(item);
      },
      onLoading: () => {},
      getCommandConfirmation: async () => ({
        review: ReviewDecision.NO_CONTINUE,
      }),
      onLastResponseId: () => {},
    });

    await agent.run([
      {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: "Please respond with a short confirmation message.",
          },
        ],
      } as any,
    ]);

    agent.terminate();

    const hasAssistantMessage = received.some(
      (item) => item.type === "message" && (item as any).role === "assistant",
    );

    expect(hasAssistantMessage).toBe(true);
  });
});

