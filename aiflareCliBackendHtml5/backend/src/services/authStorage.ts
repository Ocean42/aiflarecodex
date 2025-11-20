import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { recordSuccessfulLogin } from "./authState.js";
import { logToFile } from "./logWriter.js";

const AUTH_FILE_PATH =
  process.env["CODEX_AUTH_FILE"] ??
  path.join(os.homedir(), ".codey", "auth.json");
const LOGIN_LOG_FILE = process.env["LOGIN_LOG_FILE"] ?? "login.log";

export async function persistAuthData(authData: unknown): Promise<void> {
  if (!authData || typeof authData !== "object") {
    throw new Error("invalid_auth_payload");
  }
  await fs.mkdir(path.dirname(AUTH_FILE_PATH), { recursive: true });
  await fs.writeFile(
    AUTH_FILE_PATH,
    JSON.stringify(authData, null, 2),
    "utf8",
  );
  logToFile(LOGIN_LOG_FILE, "[login]", "Auth file updated from CLI upload", {
    path: AUTH_FILE_PATH,
  });
  recordSuccessfulLogin("cli_upload");
}
