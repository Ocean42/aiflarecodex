// @ts-nocheck
const cache = {
    snapshot: null,
    updatedAt: null,
};
export function setLatestRateLimitSnapshot(snapshot) {
    cache.snapshot = snapshot;
    cache.updatedAt = snapshot ? Date.now() : null;
}
export function getLatestRateLimitSnapshot() {
    return { ...cache };
}
