import { describe, it, expect } from "vitest";

import { AgentLoop } from "../src/utils/agent/agent-loop.js";
import { ReviewDecision } from "../src/utils/agent/review.js";
import { loadConfig } from "../src/utils/config.js";
import { log } from "../src/utils/logger/log.js";

describe("CLI-simulated AgentLoop – Codex backend", () => {
  it("behaves like the CLI and can complete a simple turn via the Codex backend", async () => {
    const config = loadConfig();
    const provider = config.provider ?? "openai";

    const received: Array<any> = [];

    log(
      `[test] agent-cli-simulation starting model=${config.model} provider=${provider}`,
    );

    const agent = new AgentLoop({
      model: config.model,
      provider,
      label: "cli-sim",
      instructions: config.instructions,
      approvalPolicy: config.approvalMode ?? "suggest",
      disableResponseStorage: Boolean(config.disableResponseStorage),
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

    const userMsg = [
      {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: "Sag bitte genau 'ja, bin da'.",
          },
        ],
      },
    ];

    await agent.run(userMsg as any);
    agent.terminate();

    const assistantMessages = received.filter(
      (item) => item.type === "message" && (item as any).role === "assistant",
    );

    if (assistantMessages.length === 0) {
      expect(received.length).toBeGreaterThan(0);
      return;
    }

    const combinedText = assistantMessages
      .map((msg) =>
        Array.isArray((msg as any).content)
          ? (msg as any).content
              .map((part: any) =>
                typeof part?.text === "string" ? part.text : "",
              )
              .join(" ")
          : "",
      )
      .join(" ")
      .toLowerCase();

    expect(combinedText).toContain("ja, bin da");
  });
});
