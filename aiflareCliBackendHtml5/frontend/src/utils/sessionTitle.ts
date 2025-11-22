import type { SessionId, SessionSummary } from "@aiflare/protocol";

function basename(input: string): string {
  if (!input) return "";
  const parts = input.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

export function deriveSessionTitle(
  summary: SessionSummary | undefined,
  sessionId: SessionId,
): string {
  const base =
    (summary?.title && summary.title.trim().length > 0
      ? summary.title.trim()
      : basename(summary?.workdir ?? "")) || sessionId;
  const shortId = sessionId.slice(0, 6);
  if (base.includes(shortId)) {
    return base;
  }
  return `${base} (${shortId})`;
}
