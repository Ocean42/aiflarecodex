import type { RateLimitSnapshot } from "./rateLimitTypes.js";

type RateLimitCacheState = {
  snapshot: RateLimitSnapshot | null;
  updatedAt: number | null;
};

const cache: RateLimitCacheState = {
  snapshot: null,
  updatedAt: null,
};

export function setLatestRateLimitSnapshot(
  snapshot: RateLimitSnapshot | null,
): void {
  cache.snapshot = snapshot;
  cache.updatedAt = snapshot ? Date.now() : null;
}

export function getLatestRateLimitSnapshot(): RateLimitCacheState {
  return { ...cache };
}
