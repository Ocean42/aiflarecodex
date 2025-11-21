import fs from "node:fs/promises";
import path from "node:path";

import { recordSuccessfulLogin } from "./authState.js";
import { logToFile } from "./logWriter.js";
import { getAuthFilePath } from "../utils/codexHome.js";

const LOGIN_LOG_FILE = process.env["LOGIN_LOG_FILE"] ?? "login.log";

export async function persistAuthData(authData: unknown): Promise<void> {
  if (!authData || typeof authData !== "object") {
    throw new Error("invalid_auth_payload");
  }
  const authPath = getAuthFilePath();
  await fs.mkdir(path.dirname(authPath), { recursive: true });
  await fs.writeFile(
    authPath,
    JSON.stringify(authData, null, 2),
    "utf8",
  );
  logToFile(LOGIN_LOG_FILE, "[login]", "Auth file updated from CLI upload", {
    path: authPath,
  });
  recordSuccessfulLogin("cli_upload");
}
