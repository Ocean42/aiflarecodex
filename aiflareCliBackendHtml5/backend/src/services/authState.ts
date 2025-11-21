import fs from "node:fs";
import path from "node:path";
import { logToFile } from "./logWriter.js";
import { DataDirectory } from "../utils/dataDirectory.js";
import { getAuthFilePath } from "../utils/codexHome.js";

type AuthStatusInternal = {
  status: "logged_out" | "logged_in";
  lastLoginAt?: string;
  lastLoginUrl?: string;
};

export type AuthStatusResponse = {
  status: AuthStatusInternal["status"];
  loggedIn: boolean;
  lastLoginAt?: string;
  pendingLogins?: Array<{ cliId: string }>;
};

const STATE_FILE = path.join(DataDirectory.getPath(), "auth-state.json");
const AUTH_LOG_PREFIX = "[auth-state]";
const AUTH_LOG_FILE = process.env["AUTH_LOG_FILE"] ?? "auth.log";

function ensureStateDir(): void {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
}

function log(message: string, extra?: unknown): void {
  logToFile(AUTH_LOG_FILE, AUTH_LOG_PREFIX, message, extra);
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

export function initializeAuthState(): void {
  getState();
  log(`state file: ${STATE_FILE}`);
  log(`credential file: ${getAuthFilePath()}`);
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
