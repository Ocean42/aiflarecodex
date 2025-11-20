// @ts-nocheck
import { homedir } from "os";
import { join } from "path";
/**
 * Resolve the Codey home directory.
 *
 * Always `~/.codey` – no environment overrides or fallbacks.
 */
export function getCodexHomeDir() {
    return join(homedir(), ".codey");
}
export function getAuthFilePath() {
    return join(getCodexHomeDir(), "auth.json");
}
export function getSessionsRoot() {
    return join(getCodexHomeDir(), "sessions");
}
export function getHistoryFilePath() {
    return join(getCodexHomeDir(), "history.json");
}
