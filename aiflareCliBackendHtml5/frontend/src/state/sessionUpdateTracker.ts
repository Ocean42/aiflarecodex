import type { SessionId } from "@aiflare/protocol";

const updateCounts = new Map<SessionId, number>();

declare global {
  interface Window {
    getSessionMessageUpdateCount?: (sessionId: SessionId) => number;
  }
}

function installGlobalAccessor(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.getSessionMessageUpdateCount = (sessionId: SessionId) =>
    updateCounts.get(sessionId) ?? 0;
}

installGlobalAccessor();

export function recordSessionMessageUpdate(sessionId: SessionId): void {
  const next = (updateCounts.get(sessionId) ?? 0) + 1;
  updateCounts.set(sessionId, next);
}

export function resetSessionMessageUpdates(
  sessionId: SessionId,
): void {
  updateCounts.delete(sessionId);
}

export function getSessionMessageUpdateCount(
  sessionId: SessionId,
): number {
  return updateCounts.get(sessionId) ?? 0;
}
