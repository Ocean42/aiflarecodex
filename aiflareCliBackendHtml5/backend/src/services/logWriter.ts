import fs from "node:fs";
import path from "node:path";

const DEFAULT_LOG_DIR = path.resolve(process.cwd(), "..", "log");

export function getLogDir(): string {
  return process.env["LOG_DIR"]
    ? path.resolve(process.cwd(), process.env["LOG_DIR"]!)
    : DEFAULT_LOG_DIR;
}

function ensureLogDir(): void {
  fs.mkdirSync(getLogDir(), { recursive: true });
}

export function appendLogLine(fileName: string, line: string): void {
  ensureLogDir();
  const target = path.join(getLogDir(), fileName);
  fs.appendFileSync(target, `${line}\n`, "utf8");
}

export function formatLogEntry(
  prefix: string,
  message: string,
  extra?: unknown,
): string {
  const base = `${new Date().toISOString()} ${prefix} ${message}`;
  if (extra === undefined) {
    return base;
  }
  if (typeof extra === "string") {
    return `${base} ${extra}`;
  }
  try {
    return `${base} ${JSON.stringify(extra)}`;
  } catch {
    return `${base} ${String(extra)}`;
  }
}

export function logToFile(
  fileName: string,
  prefix: string,
  message: string,
  extra?: unknown,
): void {
  const entry = formatLogEntry(prefix, message, extra);
  console.log(entry);
  appendLogLine(fileName, entry);
}
