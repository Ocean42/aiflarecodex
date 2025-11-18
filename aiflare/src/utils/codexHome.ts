import { homedir } from "os";
import { join } from "path";

/**
 * Resolve the Codey home directory.
 *
 * - If `AIFLARE_CODEY_HOME` is set and non-empty, use it as-is.
 * - Otherwise fall back to `~/.codey`.
 */
export function getCodexHomeDir(): string {
  const env = process.env["AIFLARE_CODEY_HOME"];
  if (env && env.trim() !== "") {
    return env.trim();
  }
  return join(homedir(), ".codey");
}

export function getAuthFilePath(): string {
  return join(getCodexHomeDir(), "auth.json");
}

export function getSessionsRoot(): string {
  return join(getCodexHomeDir(), "sessions");
}

export function getHistoryFilePath(): string {
  return join(getCodexHomeDir(), "history.json");
}
