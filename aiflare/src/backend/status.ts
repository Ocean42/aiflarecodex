import type { RateLimitSnapshot } from "./rateLimitTypes.js";
import { BackendClient } from "./client.js";
import { getChatgptBaseUrl, loadAuthTokens } from "./auth.js";

export interface BackendStatusResult {
  snapshot: RateLimitSnapshot | null;
  error?: string;
}

export async function fetchBackendRateLimits(): Promise<BackendStatusResult> {
  const tokens = await loadAuthTokens();
  if (!tokens) {
    return {
      snapshot: null,
      error:
        "No ChatGPT credentials found in AIFLARE_CODEY_HOME/auth.json (default: ~/.codey/auth.json). Run `codey --login` to connect your ChatGPT account.",
    };
  }

  const baseUrl = getChatgptBaseUrl();
  const client = new BackendClient({
    baseUrl,
    bearerToken: tokens.access_token,
    chatGptAccountId: tokens.account_id,
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
