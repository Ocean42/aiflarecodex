// @ts-nocheck
export function mapRateLimitWindow(window) {
    if (!window) {
        return null;
    }
    const usedPercent = Number(window.used_percent);
    const windowMinutes = windowMinutesFromSeconds(window.limit_window_seconds);
    const resetsAtEpochSeconds = Number.isFinite(window.reset_at)
        ? window.reset_at
        : null;
    return {
        usedPercent: Number.isFinite(usedPercent) ? usedPercent : 0,
        windowMinutes,
        resetsAtEpochSeconds,
    };
}
export function rateLimitSnapshotFromPayload(payload) {
    const details = payload.rate_limit ?? null;
    if (!details) {
        return {
            primary: null,
            secondary: null,
        };
    }
    return {
        primary: mapRateLimitWindow(details.primary_window),
        secondary: mapRateLimitWindow(details.secondary_window),
    };
}
export function windowMinutesFromSeconds(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) {
        return null;
    }
    const value = Math.floor((seconds + 59) / 60);
    return value > 0 ? value : null;
}
