import type { SessionEvent } from "@aiflare/protocol";

const DEFAULT_MAX_TOKENS = 128_000;

function maxTokensForModel(model?: string): number {
  if (!model) {
    return DEFAULT_MAX_TOKENS;
  }
  const normalized = model.toLowerCase();
  if (normalized.includes("128k")) {
    return 128_000;
  }
  if (normalized.includes("64k")) {
    return 64_000;
  }
  if (normalized.includes("32k") || normalized.includes("o3")) {
    return 32_000;
  }
  if (normalized.includes("16k")) {
    return 16_000;
  }
  if (normalized.includes("8k")) {
    return 8_000;
  }
  if (normalized.includes("4k")) {
    return 4_000;
  }
  return DEFAULT_MAX_TOKENS;
}

function approximateTokensUsed(events: Array<SessionEvent>): number {
  let charCount = 0;
  for (const event of events) {
    if (event.type !== "message") {
      continue;
    }
    if (event.role !== "user" && event.role !== "assistant") {
      continue;
    }
    for (const segment of event.content) {
      if ("text" in segment && typeof segment.text === "string") {
        charCount += segment.text.length;
      } else if ("output" in segment && typeof segment.output === "string") {
        charCount += segment.output.length;
      }
    }
  }
  return Math.ceil(charCount / 4);
}

export function calculateContextPercentRemaining(
  events: Array<SessionEvent>,
  model?: string,
): number {
  const used = approximateTokensUsed(events);
  const limit = maxTokensForModel(model);
  const remaining = Math.max(limit - used, 0);
  return (remaining / limit) * 100;
}
