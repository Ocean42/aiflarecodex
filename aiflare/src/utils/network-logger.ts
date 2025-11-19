import { logHttpDebug } from "./logger/httpDebug.js";
import { httpManager, type HttpEvent } from "./http-manager.js";

let installed = false;
let unsubscribe: (() => void) | null = null;

function maskHeaderValue(name: string, value: string): string {
  const lower = name.toLowerCase();
  if (lower === "authorization" || lower === "cookie") {
    return "<redacted>";
  }
  return value;
}

function formatHeaders(
  headers?: HeadersInit,
): Array<{ name: string; value: string }> {
  if (!headers) {
    return [];
  }

  const entries: Array<[string, string]> = [];
  if (Array.isArray(headers)) {
    for (const [name, value] of headers) {
      entries.push([name, value]);
    }
  } else if (headers instanceof Headers) {
    headers.forEach((value, name) => {
      entries.push([name, value]);
    });
  } else {
    for (const [name, value] of Object.entries(headers)) {
      if (typeof value === "string") {
        entries.push([name, value]);
      } else if (Array.isArray(value)) {
        for (const v of value) {
          entries.push([name, v]);
        }
      }
    }
  }

  return entries.map(([name, value]) => ({
    name,
    value: maskHeaderValue(name, value),
  }));
}

function formatBody(body: BodyInit | null | undefined): string {
  if (body == null) {
    return "<none>";
  }
  if (typeof body === "string") {
    return body.length > 200 ? `${body.slice(0, 200)}…` : body;
  }
  if (body instanceof URLSearchParams) {
    return body.toString();
  }
  if (
    typeof Buffer !== "undefined" &&
    typeof Buffer.isBuffer === "function" &&
    Buffer.isBuffer(body)
  ) {
    return `<buffer ${body.length} bytes>`;
  }
  if (body instanceof ArrayBuffer) {
    return `<arraybuffer ${body.byteLength} bytes>`;
  }
  if (body instanceof Blob) {
    return `<blob ${body.size} bytes>`;
  }
  if (body instanceof FormData) {
    const parts: Array<string> = [];
    for (const [name, value] of body.entries()) {
      parts.push(
        typeof value === "string"
          ? `${name}=${value}`
          : `${name}=<binary ${value.size} bytes>`,
      );
    }
    return `<form-data ${parts.join("&")}>`;
  }
  if (body instanceof ReadableStream) {
    return "<stream>";
  }
  return `<unknown ${typeof body}>`;
}

export function installFetchLogger(): void {
  if (installed) {
    return;
  }
  installed = true;

  unsubscribe = httpManager.addListener((event: HttpEvent) => {
    if (event.type === "request") {
      const headerEntries = formatHeaders(event.headers);
      const bodyText = formatBody(event.bodySummary ?? null);
      logHttpDebug({
        phase: "request",
        method: event.method,
        url: event.url,
        headers: headerEntries,
        body: bodyText,
        tag: "fetch",
      });
    } else if (event.type === "response") {
      logHttpDebug({
        phase: "response",
        method: event.method,
        url: event.url,
        headers: formatHeaders(event.headers),
        body: undefined,
        tag: "fetch",
        extra: {
          status: event.status,
          durationMs: event.durationMs,
        },
      });
    } else {
      logHttpDebug({
        phase: "error",
        method: event.method,
        url: event.url,
        body: event.error,
        tag: "fetch",
      });
    }
  });
}

export function uninstallFetchLoggerForTests(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  installed = false;
}
