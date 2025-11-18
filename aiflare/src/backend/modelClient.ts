import type OpenAI from "openai";
import type {
  ResponseCreateParams,
  ResponseInputItem,
} from "openai/resources/responses/responses.mjs";

import type { AppConfig } from "../utils/config.js";

export interface ResponsesTurnConfig {
  model: string;
  instructions: string;
  input: Array<ResponseInputItem>;
  tools: ResponseCreateParams["tools"];
  parallelToolCalls: boolean;
  disableResponseStorage: boolean;
  previousResponseId: string;
  reasoning?: ResponseCreateParams["reasoning"];
  flexMode?: boolean;
  config: AppConfig;
  include?: ResponseCreateParams["include"];
  promptCacheKey?: string;
}

export function createResponsesRequest(
  turn: ResponsesTurnConfig,
): ResponseCreateParams {
  const { model, instructions, input, tools } = turn;

  const baseInclude = turn.include ?? ["reasoning.encrypted_content"];
  const base: ResponseCreateParams = {
    model,
    instructions,
    input,
    stream: true,
    parallel_tool_calls: turn.parallelToolCalls,
    reasoning: turn.reasoning,
    ...(turn.flexMode ? { service_tier: "flex" } : {}),
    tools,
    include: baseInclude,
    tool_choice: "auto",
  };

  const request: ResponseCreateParams = turn.disableResponseStorage
    ? {
        ...base,
        store: false,
      }
    : {
        ...base,
        store: true,
        previous_response_id:
          turn.previousResponseId && turn.previousResponseId.trim() !== ""
            ? turn.previousResponseId
            : undefined,
      };

  if (turn.promptCacheKey) {
    (
      request as ResponseCreateParams & { prompt_cache_key?: string }
    ).prompt_cache_key = turn.promptCacheKey;
  }

  return request;
}

export async function startResponsesStream(
  client: OpenAI | OpenAI.AzureOpenAI,
  params: ResponseCreateParams,
): Promise<AsyncIterable<unknown>> {
  // The OpenAI client returns an async iterable when `stream: true` is set.
  // We keep the return type intentionally loose here (`AsyncIterable<unknown>`)
  // so callers can cast to the concrete event type they expect (e.g.
  // `AsyncIterable<ResponseEvent>`).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyClient = client as any;
  return anyClient.responses.create(params);
}
