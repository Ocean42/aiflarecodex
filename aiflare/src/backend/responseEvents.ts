import type { RateLimitSnapshot } from "./rateLimitTypes.js";
import type { ResponseEvent as WireResponseEvent } from "../utils/responses.js";

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export type CoreResponseEvent =
  | { type: "created" }
  | { type: "output_item_added"; item: unknown }
  | { type: "output_item_done"; item: unknown }
  | { type: "completed"; responseId: string; tokenUsage?: TokenUsage }
  | { type: "output_text_delta"; delta: string }
  | {
      type: "reasoning_summary_delta";
      delta: string;
      summaryIndex: number;
    }
  | {
      type: "reasoning_content_delta";
      delta: string;
      contentIndex: number;
    }
  | { type: "reasoning_summary_part_added"; summaryIndex: number }
  | { type: "rate_limits"; snapshot: RateLimitSnapshot };

function mapUsage(usage: unknown): TokenUsage | undefined {
  if (!usage || typeof usage !== "object") {
    return undefined;
  }
  const u = usage as {
    input_tokens?: unknown;
    output_tokens?: unknown;
    total_tokens?: unknown;
  };
  const inputTokens =
    typeof u.input_tokens === "number" && Number.isFinite(u.input_tokens)
      ? u.input_tokens
      : undefined;
  const outputTokens =
    typeof u.output_tokens === "number" && Number.isFinite(u.output_tokens)
      ? u.output_tokens
      : undefined;
  const totalTokens =
    typeof u.total_tokens === "number" && Number.isFinite(u.total_tokens)
      ? u.total_tokens
      : undefined;

  if (
    inputTokens === undefined &&
    outputTokens === undefined &&
    totalTokens === undefined
  ) {
    return undefined;
  }

  return {
    inputTokens: inputTokens ?? 0,
    outputTokens: outputTokens ?? 0,
    totalTokens: totalTokens ?? 0,
  };
}

export function mapWireEventToCore(
  ev: WireResponseEvent,
): CoreResponseEvent | null {
  switch (ev.type) {
    case "response.created":
      return { type: "created" };
    case "response.output_item.added":
      return { type: "output_item_added", item: ev.item };
    case "response.output_item.done":
      return { type: "output_item_done", item: ev.item };
    case "response.output_text.delta":
      return { type: "output_text_delta", delta: String(ev.delta) };
    case "response.reasoning_summary_text.delta":
      if (
        typeof ev.summary_index === "number" &&
        typeof ev.delta === "string"
      ) {
        return {
          type: "reasoning_summary_delta",
          summaryIndex: ev.summary_index,
          delta: ev.delta,
        };
      }
      return null;
    case "response.reasoning_text.delta":
      if (
        typeof ev.content_index === "number" &&
        typeof ev.delta === "string"
      ) {
        return {
          type: "reasoning_content_delta",
          contentIndex: ev.content_index,
          delta: ev.delta,
        };
      }
      return null;
    case "response.reasoning_summary_part.added":
      if (typeof ev.summary_index === "number") {
        return {
          type: "reasoning_summary_part_added",
          summaryIndex: ev.summary_index,
        };
      }
      return null;
    case "response.completed": {
      const usage = mapUsage(ev.response.usage as unknown);
      return {
        type: "completed",
        responseId: ev.response.id,
        ...(usage ? { tokenUsage: usage } : {}),
      };
    }
    default:
      return null;
  }
}
