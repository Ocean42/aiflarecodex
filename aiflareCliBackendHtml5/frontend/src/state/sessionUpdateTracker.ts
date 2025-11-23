import type { SessionId } from "@aiflare/protocol";

type SessionFlags = {
  running: boolean;
  unread: boolean;
  visible: boolean;
};

const sessionState = new Map<SessionId, SessionFlags>();
const updateCounts = new Map<SessionId, number>();
const listeners = new Set<(sessionId: SessionId, state: SessionFlags) => void>();

declare global {
  interface Window {
    getSessionTimelineUpdateCount?: (sessionId: SessionId) => number;
    getSessionState?: (sessionId: SessionId) => SessionFlags;
  }
}

function installGlobalAccessor(): void {
  if (typeof window === "undefined") {
    return;
  }
  if (!window.getSessionTimelineUpdateCount) {
    window.getSessionTimelineUpdateCount = (sessionId: SessionId) =>
      getSessionTimelineUpdateCount(sessionId);
  }
  if (!window.getSessionState) {
    window.getSessionState = (sessionId: SessionId) => getSessionState(sessionId);
  }
}

installGlobalAccessor();

function getOrInit(sessionId: SessionId): SessionFlags {
  const existing = sessionState.get(sessionId);
  if (existing) {
    return existing;
  }
  const next: SessionFlags = { running: false, unread: false, visible: false };
  sessionState.set(sessionId, next);
  return next;
}

function emitChange(sessionId: SessionId, prev: SessionFlags, next: SessionFlags): void {
  if (prev.running === next.running && prev.unread === next.unread && prev.visible === next.visible) {
    return;
  }
  listeners.forEach((listener) => listener(sessionId, next));
}

export function setSessionRunning(sessionId: SessionId, running: boolean): void {
  const prev = getOrInit(sessionId);
  if (prev.running === running) return;
  const next = { ...prev, running };
  sessionState.set(sessionId, next);
  emitChange(sessionId, prev, next);
}

export function setSessionUnread(sessionId: SessionId, unread: boolean): void {
  const prev = getOrInit(sessionId);
  if (prev.unread === unread) return;
  const next = { ...prev, unread };
  sessionState.set(sessionId, next);
  emitChange(sessionId, prev, next);
}

export function setSessionVisible(sessionId: SessionId, visible: boolean): void {
  const prev = getOrInit(sessionId);
  if (prev.visible === visible && (visible ? prev.unread === false : true)) {
    return;
  }
  const next = { ...prev, visible };
  if (visible) {
    next.unread = false;
  }
  sessionState.set(sessionId, next);
  emitChange(sessionId, prev, next);
}

export function getSessionState(sessionId: SessionId): SessionFlags {
  return { ...getOrInit(sessionId) };
}

export function listenOnStateChanges(
  listener: (sessionId: SessionId, state: SessionFlags) => void,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function recordSessionTimelineUpdate(sessionId: SessionId): void {
  const nextCount = (updateCounts.get(sessionId) ?? 0) + 1;
  updateCounts.set(sessionId, nextCount);
  const prev = getOrInit(sessionId);
  const next = { ...prev };
  if (!prev.visible) {
    next.unread = true;
  }
  sessionState.set(sessionId, next);
  emitChange(sessionId, prev, next);
}

export function resetSessionTimelineUpdates(sessionId: SessionId): void {
  updateCounts.delete(sessionId);
  const prev = getOrInit(sessionId);
  const next = { ...prev, unread: false };
  sessionState.set(sessionId, next);
  emitChange(sessionId, prev, next);
}

export function getSessionTimelineUpdateCount(sessionId: SessionId): number {
  return updateCounts.get(sessionId) ?? 0;
}

export function isSessionRunning(sessionId: SessionId): boolean {
  return getOrInit(sessionId).running;
}
