import { getChatgptBaseUrl } from "./auth.js";
import type { AuthDotJson } from "./authModel.js";
import { loadAuthDotJson } from "./authModel.js";

export interface BackendAuth {
  baseUrl: string;
  accessToken: string;
  accountId?: string;
}

export async function getBackendAuth(): Promise<BackendAuth | null> {
  const auth = await loadAuthDotJson();
  if (!auth?.tokens) {
    return null;
  }

  const baseUrl = getChatgptBaseUrl();
  const { accessToken, accountId } = auth.tokens;

  if (!accessToken || accessToken.trim() === "") {
    return null;
  }

  return {
    baseUrl,
    accessToken,
    accountId,
  };
}

export async function getOpenaiApiKey(): Promise<string | null> {
  const auth: AuthDotJson | null = await loadAuthDotJson();
  const key = auth?.OPENAI_API_KEY;
  if (key && key.trim() !== "") {
    return key.trim();
  }
  return null;
}

