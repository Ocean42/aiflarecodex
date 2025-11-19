import { homedir } from "os";
import { join } from "path";

/**
 * Resolve the Codey home directory.
 *
 * Always `~/.codey` – no environment overrides or fallbacks.
 */
export function getCodexHomeDir(): string {
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
