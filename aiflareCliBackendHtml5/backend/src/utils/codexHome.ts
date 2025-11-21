// @ts-nocheck
import path from "node:path";
import { DataDirectory } from "./dataDirectory.js";
export function getCodexHomeDir() {
    return DataDirectory.getPath();
}
export function getAuthFilePath() {
    return DataDirectory.resolve("auth.json");
}
export function getSessionsRoot() {
    return DataDirectory.resolve("sessions");
}
export function getHistoryFilePath() {
    return DataDirectory.resolve("history.json");
}
