import type { RateLimitSnapshot } from "./rateLimitTypes.js";
import { BackendClient } from "./client.js";
import { BackendCredentials } from "./backend-credentials.js";

export interface BackendStatusResult {
  snapshot: RateLimitSnapshot | null;
  error?: string;
}

export async function fetchBackendRateLimits(): Promise<BackendStatusResult> {
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
    return { snapshot };
  } catch (err) {
    return {
      snapshot: null,
      error: `Unable to fetch backend rate limits: ${(err as Error).message}`,
    };
  }
}
