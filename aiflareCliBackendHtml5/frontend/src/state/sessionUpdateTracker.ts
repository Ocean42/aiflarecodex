import type { SessionId } from "@aiflare/protocol";

const updateCounts = new Map<SessionId, number>();

declare global {
  interface Window {
    getSessionTimelineUpdateCount?: (sessionId: SessionId) => number;
  }
}

function installGlobalAccessor(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.getSessionTimelineUpdateCount = (sessionId: SessionId) =>
    updateCounts.get(sessionId) ?? 0;
}

installGlobalAccessor();

export function recordSessionTimelineUpdate(sessionId: SessionId): void {
  const next = (updateCounts.get(sessionId) ?? 0) + 1;
  updateCounts.set(sessionId, next);
}

export function resetSessionTimelineUpdates(
  sessionId: SessionId,
): void {
  updateCounts.delete(sessionId);
}

export function getSessionTimelineUpdateCount(
  sessionId: SessionId,
): number {
  return updateCounts.get(sessionId) ?? 0;
}
