export type PlanType =
  | "free"
  | "go"
  | "plus"
  | "pro"
  | "team"
  | "business"
  | "education"
  | "quorum"
  | "enterprise"
  | "edu";

// TypeScript mirrors der OpenAPI-Modelle aus
// codex-rs/codex-backend-openapi-models:

export interface RateLimitWindowSnapshot {
  used_percent: number;
  limit_window_seconds: number;
  reset_after_seconds: number;
  reset_at: number;
}

export interface RateLimitStatusDetails {
  allowed: boolean;
  limit_reached: boolean;
  primary_window?: RateLimitWindowSnapshot | null;
  secondary_window?: RateLimitWindowSnapshot | null;
}

export interface RateLimitStatusPayload {
  plan_type: PlanType;
  rate_limit?: RateLimitStatusDetails | null;
}

// Vereinfachte Darstellung für die CLI, analog zu codex_protocol::RateLimitWindow.

export interface RateLimitWindow {
  usedPercent: number;
  windowMinutes: number | null;
  resetsAtEpochSeconds: number | null;
}

export interface RateLimitSnapshot {
  primary: RateLimitWindow | null;
  secondary: RateLimitWindow | null;
}

export function mapRateLimitWindow(
  window: RateLimitWindowSnapshot | null | undefined,
): RateLimitWindow | null {
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

export function rateLimitSnapshotFromPayload(
  payload: RateLimitStatusPayload,
): RateLimitSnapshot {
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

export function windowMinutesFromSeconds(seconds: number): number | null {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }
  const value = Math.floor((seconds + 59) / 60);
  return value > 0 ? value : null;
}

