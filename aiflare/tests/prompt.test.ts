import { describe, it, expect } from "vitest";

import type { ResponseCreateParams } from "openai/resources/responses/responses.mjs";

import { promptToResponsesTurn } from "../src/backend/prompt.js";

describe("Prompt → ResponsesTurnConfig", () => {
  const baseCtx = {
    model: "gpt-4.1-mini",
    instructions: "base instructions",
    previousResponseId: "",
    disableResponseStorage: false,
    config: {
      model: "gpt-4.1-mini",
      instructions: "base instructions",
    } as any,
  };

  it("prefers baseInstructionsOverride from the prompt when present", () => {
    const prompt = {
      input: [] as Array<ResponseCreateParams["input"][number]>,
      tools: [],
      parallelToolCalls: false,
      baseInstructionsOverride: "override",
    };

    const turn = promptToResponsesTurn(prompt, baseCtx);
    expect(turn.instructions).toBe("override");
    expect(turn.parallelToolCalls).toBe(false);
  });

  it("falls back to context instructions when override is absent", () => {
    const prompt = {
      input: [] as Array<ResponseCreateParams["input"][number]>,
      tools: [],
      parallelToolCalls: true,
    };

    const turn = promptToResponsesTurn(prompt, baseCtx);
    expect(turn.instructions).toBe("base instructions");
    expect(turn.parallelToolCalls).toBe(true);
  });
});

