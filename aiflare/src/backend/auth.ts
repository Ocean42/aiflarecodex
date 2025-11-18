import fs from "fs/promises";
import path from "path";

import { getAuthFilePath, getCodexHomeDir } from "../utils/codexHome.js";

export interface AuthTokens {
  id_token: string;
  access_token: string;
  refresh_token: string;
  account_id?: string;
}

export interface AuthFile {
  OPENAI_API_KEY?: string;
  tokens?: AuthTokens;
  last_refresh?: string;
}

export async function loadAuthFile(): Promise<AuthFile | null> {
  const authDir = getCodexHomeDir();
  const authFile = getAuthFilePath();

  try {
    const contents = await fs.readFile(authFile, "utf-8");
    const parsed = JSON.parse(contents) as AuthFile;
    return parsed;
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException;
    if (e && (e.code === "ENOENT" || e.code === "ENOTDIR")) {
      return null;
    }
    // Für andere Fehler weiterwerfen – das entspricht dem Rust-Verhalten,
    // bei beschädigten Dateien explizit zu scheitern.
    throw err;
  }
}

export async function loadAuthTokens(): Promise<AuthTokens | null> {
  const auth = await loadAuthFile();
  if (!auth?.tokens) {
    return null;
  }

  const { id_token, access_token, refresh_token, account_id } = auth.tokens;
  if (!id_token || !access_token || !refresh_token) {
    return null;
  }

  return {
    id_token,
    access_token,
    refresh_token,
    account_id,
  };
}

/**
 * Liefert die Basis-URL für das ChatGPT/Codex-Backend.
 *
 * Entspricht semantisch dem Feld `chatgpt_base_url` in der Rust-Config
 * und fällt, wenn nichts konfiguriert ist, auf
 * `https://chatgpt.com/backend-api/` zurück.
 */
export function getChatgptBaseUrl(): string {
  const env = process.env["CHATGPT_BASE_URL"];
  if (env && env.trim() !== "") {
    return env.trim().replace(/\/+$/, "");
  }
  return "https://chatgpt.com/backend-api";
}

/**
 * Basis-URL für das Codex-API, analog zu
 * `ModelProviderInfo::get_full_url` in der Rust-Implementierung:
 *
 * - Für ChatGPT-Auth: `https://chatgpt.com/backend-api/codex`.
 */
export function getCodexBackendBaseUrl(): string {
  const base = getChatgptBaseUrl().replace(/\/+$/, "");
  if (base.endsWith("/codex")) {
    return base;
  }
  return `${base}/codex`;
}
