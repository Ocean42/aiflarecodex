import { logHttpDebug } from "./logger/httpDebug.js";

let installed = false;

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

function describeInput(
  input: RequestInfo,
  init?: RequestInit,
): { url: string; method: string; headers?: HeadersInit; body?: BodyInit } {
  if (typeof input === "string") {
    return {
      url: input,
      method: (init?.method ?? "GET").toUpperCase(),
      headers: init?.headers,
      body: init?.body ?? undefined,
    };
  }
  if (input instanceof URL) {
    return {
      url: input.toString(),
      method: (init?.method ?? "GET").toUpperCase(),
      headers: init?.headers,
      body: init?.body ?? undefined,
    };
  }

  return {
    url: input.url,
    method: (init?.method ?? input.method ?? "GET").toUpperCase(),
    headers: init?.headers ?? input.headers,
    body: init?.body ?? (input as Request).body ?? undefined,
  };
}

export function installFetchLogger(): void {
  if (installed || typeof globalThis.fetch !== "function") {
    return;
  }
  installed = true;
  const originalFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = async (
    input: RequestInfo,
    init?: RequestInit,
  ): Promise<Response> => {
    const { url, method, headers, body } = describeInput(input, init);
    const headerEntries = formatHeaders(headers);
    const bodyText = formatBody(body);
    logHttpDebug({
      phase: "request",
      method,
      url,
      headers: headerEntries,
      body: bodyText,
      tag: "fetch",
    });

    try {
      const response = await originalFetch(input, init);
      logHttpDebug({
        phase: "response",
        method,
        url,
        headers: formatHeaders(response.headers),
        body: undefined,
        tag: "fetch",
        extra: {
          status: response.status,
          contentType: response.headers.get("content-type") ?? "<unknown>",
        },
      });
      return response;
    } catch (error) {
      logHttpDebug({
        phase: "error",
        method,
        url,
        body: error instanceof Error ? error.message : String(error),
        tag: "fetch",
      });
      throw error;
    }
  };
}
