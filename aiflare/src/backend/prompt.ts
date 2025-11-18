import type {
  ResponseCreateParams,
  ResponseInputItem,
} from "openai/resources/responses/responses.mjs";

import type { ResponsesTurnConfig } from "./modelClient.js";
import type { AppConfig } from "../utils/config.js";

export interface Prompt {
  input: Array<ResponseInputItem>;
  tools: ResponseCreateParams["tools"];
  parallelToolCalls: boolean;
  baseInstructionsOverride?: string;
  outputSchema?: unknown;
}

export interface PromptContext {
  model: string;
  instructions: string;
  previousResponseId: string;
  disableResponseStorage: boolean;
  reasoning?: ResponseCreateParams["reasoning"];
  flexMode?: boolean;
  config: AppConfig;
  include?: ResponseCreateParams["include"];
  promptCacheKey?: string;
}

export function promptToResponsesTurn(
  prompt: Prompt,
  ctx: PromptContext,
): ResponsesTurnConfig {
  const mergedInstructions =
    prompt.baseInstructionsOverride &&
    prompt.baseInstructionsOverride.trim() !== ""
      ? prompt.baseInstructionsOverride
      : ctx.instructions;

  return {
    model: ctx.model,
    instructions: mergedInstructions,
    input: prompt.input,
    tools: prompt.tools,
    parallelToolCalls: prompt.parallelToolCalls,
    disableResponseStorage: ctx.disableResponseStorage,
    previousResponseId: ctx.previousResponseId,
    reasoning: ctx.reasoning,
    flexMode: ctx.flexMode,
    config: ctx.config,
    include: ctx.include,
    promptCacheKey: ctx.promptCacheKey,
  };
}
