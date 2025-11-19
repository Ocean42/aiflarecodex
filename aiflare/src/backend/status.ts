import type { RateLimitSnapshot } from "./rateLimitTypes.js";
import { BackendClient } from "./client.js";
import { BackendCredentials } from "./backend-credentials.js";
import {
  getLatestRateLimitSnapshot,
  setLatestRateLimitSnapshot,
} from "./rateLimitCache.js";

export interface BackendStatusResult {
  snapshot: RateLimitSnapshot | null;
  error?: string;
  fromCache?: boolean;
}

export async function fetchBackendRateLimits(
  options?: { force?: boolean },
): Promise<BackendStatusResult> {
  const cached = getLatestRateLimitSnapshot();
  if (cached.snapshot && !options?.force) {
    return { snapshot: cached.snapshot, fromCache: true };
  }

  let creds: BackendCredentials;
  try {
    creds = BackendCredentials.ensure();
  } catch (error) {
    return {
      snapshot: null,
      error: (error as Error).message,
    };
  }

  const client = new BackendClient({
    ...creds.toBackendClientOptions(),
  });

  try {
    const snapshot = await client.getRateLimits();
    setLatestRateLimitSnapshot(snapshot);
    return { snapshot };
  } catch (err) {
    return {
      snapshot: null,
      error: `Unable to fetch backend rate limits: ${(err as Error).message}`,
    };
  }
}
