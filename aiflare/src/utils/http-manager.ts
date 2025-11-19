type HttpHeaders = Record<string, string>;

export type HttpRequestEvent = {
  type: "request";
  id: number;
  method: string;
  url: string;
  headers: HttpHeaders;
  bodySummary?: string;
  timestamp: number;
};

export type HttpResponseEvent = {
  type: "response";
  id: number;
  method: string;
  url: string;
  status: number;
  ok: boolean;
  headers: HttpHeaders;
  durationMs: number;
};

export type HttpErrorEvent = {
  type: "error";
  id: number;
  method: string;
  url: string;
  error: string;
};

export type HttpEvent = HttpRequestEvent | HttpResponseEvent | HttpErrorEvent;
export type HttpEventListener = (event: HttpEvent) => void;

function headersToObject(headers?: HeadersInit): HttpHeaders {
  if (!headers) {
    return {};
  }
  const map: HttpHeaders = {};
  if (headers instanceof Headers) {
    headers.forEach((value, name) => {
      map[name.toLowerCase()] = value;
    });
    return map;
  }
  if (Array.isArray(headers)) {
    for (const [name, value] of headers) {
      map[name.toLowerCase()] = value;
    }
    return map;
  }
  for (const [name, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      map[name.toLowerCase()] = value.join(", ");
    } else if (typeof value === "string") {
      map[name.toLowerCase()] = value;
    }
  }
  return map;
}

function describeBody(body: BodyInit | null | undefined): string | undefined {
  if (body == null) {
    return undefined;
  }
  if (typeof body === "string") {
    return body.length > 200 ? `${body.slice(0, 200)}…` : body;
  }
  if (body instanceof URLSearchParams) {
    return body.toString();
  }
  if (
    typeof Buffer !== "undefined" &&
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    typeof Buffer.isBuffer === "function" &&
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
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
    return "<form-data>";
  }
  if (body instanceof ReadableStream) {
    return "<stream>";
  }
  return `<${typeof body}>`;
}

function normalizeMethod(method?: string): string {
  return (method ?? "GET").toUpperCase();
}

function extractUrl(input: RequestInfo): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  return (input as Request).url;
}

function extractHeaders(input: RequestInfo, init?: RequestInit): HeadersInit {
  if (init?.headers) {
    return init.headers;
  }
  if (typeof input === "string" || input instanceof URL) {
    return {};
  }
  return (input as Request).headers;
}

function extractBody(
  input: RequestInfo,
  init?: RequestInit,
): BodyInit | null | undefined {
  if (typeof init?.body !== "undefined") {
    return init.body;
  }
  if (typeof input === "string" || input instanceof URL) {
    return undefined;
  }
  return (input as Request).body;
}

export class HttpManager {
  private listeners = new Set<HttpEventListener>();
  private baseFetch: typeof fetch | null = null;
  private originalFetch: typeof fetch | null = null;
  private requestCounter = 0;
  private installed = false;

  constructor() {
    if (typeof globalThis.fetch === "function") {
      this.baseFetch = globalThis.fetch.bind(globalThis);
      this.originalFetch = this.baseFetch;
    }
  }

  installGlobalHook(): void {
    if (this.installed || typeof globalThis.fetch !== "function") {
      return;
    }
    this.installed = true;
    const wrapped = this.fetch.bind(this) as typeof fetch;
    globalThis.fetch = wrapped;
  }

  addListener(listener: HttpEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Test-only helper to stub the underlying fetch implementation.
   */
  setBaseFetchForTests(fn: typeof fetch): void {
    this.baseFetch = fn;
  }

  resetBaseFetch(): void {
    this.baseFetch = this.originalFetch;
  }

  async fetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
    if (!this.baseFetch) {
      throw new Error("fetch is not available in this environment");
    }

    const requestId = ++this.requestCounter;
    const url = extractUrl(input);
    const method = normalizeMethod(init?.method ?? (input as Request)?.method);
    const headers = headersToObject(extractHeaders(input, init));
    const bodySummary = describeBody(extractBody(input, init));

    const timestamp = Date.now();
    this.emit({
      type: "request",
      id: requestId,
      method,
      url,
      headers,
      bodySummary,
      timestamp,
    });

    const start = typeof performance !== "undefined" ? performance.now() : Date.now();

    try {
      const response = await this.baseFetch(input as RequestInfo, init);
      const durationRaw =
        typeof performance !== "undefined" ? performance.now() - start : Date.now() - (start as number);
      this.emit({
        type: "response",
        id: requestId,
        method,
        url,
        status: response.status,
        ok: response.ok,
        headers: headersToObject(response.headers),
        durationMs: durationRaw,
      });
      return response;
    } catch (error) {
      this.emit({
        type: "error",
        id: requestId,
        method,
        url,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private emit(event: HttpEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Best-effort logging; swallow listener errors so we don't break fetch calls.
      }
    }
  }
}

export const httpManager = new HttpManager();
httpManager.installGlobalHook();
