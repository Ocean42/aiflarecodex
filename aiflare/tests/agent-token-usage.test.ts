import { describe, it, expect, vi } from "vitest";

// Minimal OpenAI mock that returns a single `response.completed` event with
// token usage so the AgentLoop can record it.
vi.mock("openai", () => {
  class FakeOpenAI {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public responses = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      create: async function* () {
        yield {
          type: "response.completed",
          response: {
            id: "resp-1",
            status: "completed",
            output: [],
            usage: {
              input_tokens: 10,
              output_tokens: 5,
              total_tokens: 15,
              input_tokens_details: { cached_tokens: 0 },
              output_tokens_details: { reasoning_tokens: 0 },
            },
          },
        } as any;
      },
    };
  }

  class APIConnectionTimeoutError extends Error {}

  return {
    __esModule: true,
    default: FakeOpenAI,
    APIConnectionTimeoutError,
    AzureOpenAI: FakeOpenAI,
  };
});

// Silence debug logs so test output stays clean.
vi.mock("../src/utils/logger/log.js", () => ({
  __esModule: true,
  log: () => {},
  isLoggingEnabled: () => false,
}));

import { AgentLoop } from "../src/utils/agent/agent-loop.js";

describe("AgentLoop – token usage", () => {
  it("records token usage from a completed streaming response", async () => {
    const received: Array<any> = [];

    const agent = new AgentLoop({
      additionalWritableRoots: [],
      model: "gpt-4.1-mini",
      instructions: "",
      approvalPolicy: "suggest",
      disableResponseStorage: true,
      config: {
        model: "gpt-4.1-mini",
        instructions: "",
      } as any,
      onItem: (i) => received.push(i),
      onLoading: () => {},
      getCommandConfirmation: async () => ({ review: "yes" } as any),
      onLastResponseId: () => {},
    });

    const userMsg = [
      {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: "ping" }],
      },
    ];

    await agent.run(userMsg as any);

    const usage = agent.getLastTokenUsage();
    expect(usage).not.toBeNull();
    expect(usage?.inputTokens).toBe(10);
    expect(usage?.outputTokens).toBe(5);
    expect(usage?.totalTokens).toBe(15);

    // We should still have completed without throwing and may have emitted
    // zero or more items depending on how the agent processes the stream.
    expect(Array.isArray(received)).toBe(true);
  });
});

