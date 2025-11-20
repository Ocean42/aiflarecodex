import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { BackendCredentials } from "../src/backend/backend-credentials.js";
import {
  getCodexHomeDir,
  getSessionsRoot,
  getHistoryFilePath,
} from "../src/utils/codexHome.js";

function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

function ensureFile(filePath: string, contents: string): void {
  if (!existsSync(filePath)) {
    writeFileSync(filePath, contents, { encoding: "utf8", mode: 0o600 });
  }
}

(() => {
  const codexHome = getCodexHomeDir();
  ensureDir(codexHome);
  ensureDir(getSessionsRoot());
  const logDir = path.join(codexHome, "log");
  ensureDir(logDir);
  ensureDir(path.join(logDir, "tests"));

  const historyFile = getHistoryFilePath();
  ensureFile(historyFile, "[]\n");

  try {
    BackendCredentials.ensure();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `[tests/setup-real-auth] Failed to resolve Codex credentials: ${message}`,
    );
  }
})();
