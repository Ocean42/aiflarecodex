import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { logToFile } from "./logWriter.js";

type AuthStatusInternal = {
  status: "logged_out" | "logged_in";
  lastLoginAt?: string;
  lastLoginUrl?: string;
  lastCredentialCopyAt?: string;
  copiedCredentialPath?: string;
};

export type AuthStatusResponse = {
  status: AuthStatusInternal["status"];
  loggedIn: boolean;
  lastLoginAt?: string;
  pendingLogins?: Array<{ cliId: string }>;
};

const STATE_FILE =
  process.env["AUTH_STATE_FILE"] ??
  path.resolve(process.cwd(), "tmp/auth-state.json");

const COPY_FLAG =
  process.env["COPY_TO_TEST"] ??
  process.env["COPY_CREDENTIALS_TO_TEST"] ??
  "";

const SOURCE_CREDENTIALS =
  process.env["CODEX_AUTH_FILE"] ??
  path.join(os.homedir(), ".codey", "auth.json");

const TEST_CREDENTIAL_DIR = path.resolve(
  process.env["TEST_CREDENTIALS_DIR"] ?? path.join(process.cwd(), "tmp/test-credentials"),
);

function ensureStateDir(): void {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
}

function loadState(): AuthStatusInternal {
  ensureStateDir();
  if (!fs.existsSync(STATE_FILE)) {
    const initial: AuthStatusInternal = { status: "logged_out" };
    fs.writeFileSync(STATE_FILE, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
  try {
    const raw = fs.readFileSync(STATE_FILE, "utf8");
    return JSON.parse(raw) as AuthStatusInternal;
  } catch {
    return { status: "logged_out" };
  }
}

const AUTH_LOG_PREFIX = "[auth-state]";
const AUTH_LOG_FILE = process.env["AUTH_LOG_FILE"] ?? "auth.log";

function log(message: string, extra?: unknown): void {
  logToFile(AUTH_LOG_FILE, AUTH_LOG_PREFIX, message, extra);
}

let cachedState: AuthStatusInternal | null = null;

function getState(): AuthStatusInternal {
  if (!cachedState) {
    cachedState = loadState();
  }
  return cachedState;
}

function saveState(next: AuthStatusInternal): void {
  cachedState = next;
  ensureStateDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(next, null, 2), "utf8");
}

function isCopyEnabled(): boolean {
  const normalized = COPY_FLAG.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

export function initializeAuthState(): void {
  getState();
  log(`state file: ${STATE_FILE}`);
  if (isCopyEnabled()) {
    log(
      `copy-to-test enabled → source ${SOURCE_CREDENTIALS} → ${TEST_CREDENTIAL_DIR}`,
    );
    copyCredentialsToTest("startup");
  } else {
    log("copy-to-test disabled");
  }
}

export function getAuthStatus(): AuthStatusResponse {
  const state = getState();
  return {
    status: state.status,
    loggedIn: state.status === "logged_in",
    lastLoginAt: state.lastLoginAt,
    pendingLogins: [],
  };
}

export function recordSuccessfulLogin(loginUrl: string): AuthStatusResponse {
  const next: AuthStatusInternal = {
    ...getState(),
    status: "logged_in",
    lastLoginAt: new Date().toISOString(),
    lastLoginUrl: loginUrl,
  };
  saveState(next);
  log(`login recorded; url=${loginUrl}`);
  if (isCopyEnabled()) {
    copyCredentialsToTest("login");
  }
  return getAuthStatus();
}

export function logoutAuthState(): AuthStatusResponse {
  const next: AuthStatusInternal = {
    status: "logged_out",
  };
  saveState(next);
  log("Logged out via UI");
  return getAuthStatus();
}

function copyCredentialsToTest(reason: string): void {
  if (!fs.existsSync(SOURCE_CREDENTIALS)) {
    log(
      `Unable to copy credentials – source file not found: ${SOURCE_CREDENTIALS}`,
    );
    return;
  }
  try {
    fs.mkdirSync(TEST_CREDENTIAL_DIR, { recursive: true });
    const destPath = path.join(TEST_CREDENTIAL_DIR, path.basename(SOURCE_CREDENTIALS));
    fs.copyFileSync(SOURCE_CREDENTIALS, destPath);
    const updated: AuthStatusInternal = {
      ...getState(),
      lastCredentialCopyAt: new Date().toISOString(),
      copiedCredentialPath: destPath,
    };
    saveState(updated);
    log(`credentials copied to ${destPath} (reason=${reason})`);
  } catch (error) {
    console.error(`${AUTH_LOG_PREFIX} Failed to copy credentials`, error);
  }
}
