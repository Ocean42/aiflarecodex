import { log } from "../logger/log.js";

const DEFAULT_STARTUP_TIMEOUT_MS = 10_000;
const DEFAULT_TOOL_TIMEOUT_MS = 60_000;

type RawStringRecord = Record<string, unknown>;

export type McpServerTransportConfig =
  | {
      type: "stdio";
      command: string;
      args: Array<string>;
      env: Record<string, string>;
      cwd?: string;
    }
  | {
      type: "http";
      url: string;
      headers: Record<string, string>;
    };

export type McpServerDefinition = {
  name: string;
  enabled: boolean;
  startupTimeoutMs: number;
  toolTimeoutMs: number;
  enabledTools?: Array<string>;
  disabledTools?: Array<string>;
  transport: McpServerTransportConfig;
};

export type ParsedMcpServers = Record<string, McpServerDefinition>;

export function parseMcpServers(
  raw: Record<string, unknown> | undefined,
): ParsedMcpServers {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const entries = Object.entries(raw);
  const result: ParsedMcpServers = {};

  for (const [name, value] of entries) {
    if (!value || typeof value !== "object") {
      log(`[mcp] Skipping server '${name}' because it is not an object.`);
      continue;
    }

    const normalized = normalizeServerConfig(name, value as RawStringRecord);
    if (normalized) {
      result[name] = normalized;
    }
  }

  return result;
}

function normalizeServerConfig(
  name: string,
  value: RawStringRecord,
): McpServerDefinition | null {
  const enabled = readBoolean(value, "enabled", true);
  const startupTimeoutSec = readNumber(value, "startup_timeout_sec");
  const toolTimeoutSec = readNumber(value, "tool_timeout_sec");
  const startupTimeoutMs = Math.max(
    1000,
    (startupTimeoutSec ?? DEFAULT_STARTUP_TIMEOUT_MS / 1000) * 1000,
  );
  const toolTimeoutMs = Math.max(
    1000,
    (toolTimeoutSec ?? DEFAULT_TOOL_TIMEOUT_MS / 1000) * 1000,
  );

  const enabledTools = readStringArray(value, "enabled_tools");
  const disabledTools = readStringArray(value, "disabled_tools");

  const transport = buildTransportConfig(name, value);
  if (!transport) {
    return null;
  }

  return {
    name,
    enabled,
    startupTimeoutMs,
    toolTimeoutMs,
    enabledTools: enabledTools.length > 0 ? enabledTools : undefined,
    disabledTools: disabledTools.length > 0 ? disabledTools : undefined,
    transport,
  };
}

function buildTransportConfig(
  name: string,
  raw: RawStringRecord,
): McpServerTransportConfig | null {
  const command = readString(raw, "command");
  const url = readString(raw, "url");

  if (command) {
    return {
      type: "stdio",
      command,
      args: readStringArray(raw, "args"),
      env: buildEnvironment(raw),
      cwd: readString(raw, "cwd"),
    };
  }

  if (url) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch (err) {
      log(
        `[mcp] Invalid URL for server '${name}': ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return null;
    }

    return {
      type: "http",
      url: parsed.toString(),
      headers: buildHttpHeaders(raw, name),
    };
  }

  log(
    `[mcp] Server '${name}' is missing a 'command' or 'url'. At least one is required.`,
  );
  return null;
}

function buildEnvironment(raw: RawStringRecord): Record<string, string> {
  const env: Record<string, string> = {};
  const explicit = readRecord(raw, "env");
  if (explicit) {
    for (const [key, value] of Object.entries(explicit)) {
      if (typeof value === "string") {
        env[key] = value;
      }
    }
  }

  const envVars = readStringArray(raw, "env_vars");
  for (const name of envVars) {
    const value = process.env[name];
    if (value !== undefined) {
      env[name] = value;
    }
  }

  return env;
}

function buildHttpHeaders(
  raw: RawStringRecord,
  serverName: string,
): Record<string, string> {
  const headers: Record<string, string> = {};
  const explicit = readRecord(raw, "http_headers");
  if (explicit) {
    for (const [key, value] of Object.entries(explicit)) {
      if (typeof value === "string") {
        headers[key] = value;
      }
    }
  }

  const envHeaders = readRecord(raw, "env_http_headers");
  if (envHeaders) {
    for (const [header, envVar] of Object.entries(envHeaders)) {
      if (typeof envVar !== "string") {
        continue;
      }
      const value = process.env[envVar];
      if (value) {
        headers[header] = value;
      } else {
        log(
          `[mcp] Server '${serverName}' expected environment variable '${envVar}' for header '${header}', but it was not set.`,
        );
      }
    }
  }

  const bearerEnvVar = readString(raw, "bearer_token_env_var");
  if (bearerEnvVar) {
    const token = process.env[bearerEnvVar];
    if (token) {
      headers["Authorization"] ||= `Bearer ${token}`;
    } else {
      log(
        `[mcp] Server '${serverName}' expected bearer token env var '${bearerEnvVar}', but it was not set.`,
      );
    }
  }

  return headers;
}

function readString(source: RawStringRecord, key: string): string | undefined {
  const value =
    source[key] ??
    source[key.replace(/([A-Z])/g, "_$1").toLowerCase()] ??
    source[key.replace(/_/g, "")];
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }
  return undefined;
}

function readStringArray(
  source: RawStringRecord,
  key: string,
): Array<string> {
  const value =
    source[key] ??
    source[key.replace(/([A-Z])/g, "_$1").toLowerCase()] ??
    source[key.replace(/_/g, "")];
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter((entry) => entry.length > 0);
  }
  return [];
}

function readRecord(
  source: RawStringRecord,
  key: string,
): Record<string, string> | undefined {
  const value =
    source[key] ??
    source[key.replace(/([A-Z])/g, "_$1").toLowerCase()] ??
    source[key.replace(/_/g, "")];
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const result: Record<string, string> = {};
  for (const [entryKey, entryValue] of Object.entries(value)) {
    if (typeof entryValue === "string") {
      result[entryKey] = entryValue;
    }
  }
  return result;
}

function readBoolean(
  source: RawStringRecord,
  key: string,
  fallback: boolean,
): boolean {
  const value =
    source[key] ??
    source[key.replace(/([A-Z])/g, "_$1").toLowerCase()] ??
    source[key.replace(/_/g, "")];
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") {
      return true;
    }
    if (value.toLowerCase() === "false") {
      return false;
    }
  }
  return fallback;
}

function readNumber(source: RawStringRecord, key: string): number | undefined {
  const value =
    source[key] ??
    source[key.replace(/([A-Z])/g, "_$1").toLowerCase()] ??
    source[key.replace(/_/g, "")];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

export { DEFAULT_STARTUP_TIMEOUT_MS, DEFAULT_TOOL_TIMEOUT_MS };
