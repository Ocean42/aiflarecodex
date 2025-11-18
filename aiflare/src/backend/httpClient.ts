import { logHttpDebug } from "../utils/logger/httpDebug.js";

export interface HttpClientOptions {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  timeoutMs?: number;
  maxRetries?: number;
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;
  private readonly timeoutMs?: number;
  private readonly maxRetries: number;

  constructor(options: HttpClientOptions) {
    let baseUrl = options.baseUrl.trim();
    while (baseUrl.endsWith("/")) {
      baseUrl = baseUrl.slice(0, -1);
    }
    this.baseUrl = baseUrl;
    this.defaultHeaders = options.defaultHeaders ?? {};
    this.timeoutMs = options.timeoutMs;
    this.maxRetries = options.maxRetries ?? 3;
  }

  private buildUrl(path: string): string {
    if (!path) {
      return this.baseUrl;
    }
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }
    if (path.startsWith("/")) {
      return `${this.baseUrl}${path}`;
    }
    return `${this.baseUrl}/${path}`;
  }

  private buildHeaders(extra?: Record<string, string>): Headers {
    const headers = new Headers();
    for (const [k, v] of Object.entries(this.defaultHeaders)) {
      if (v !== undefined) {
        headers.set(k, v);
      }
    }
    if (extra) {
      for (const [k, v] of Object.entries(extra)) {
        if (v !== undefined) {
          headers.set(k, v);
        }
      }
    }
    return headers;
  }

  private async doFetch(
    url: string,
    init: RequestInit,
  ): Promise<Response> {
    const controller =
      this.timeoutMs !== undefined ? new AbortController() : null;
    const signal = controller?.signal;
    const timeout =
      controller && this.timeoutMs !== undefined
        ? setTimeout(() => controller.abort(), this.timeoutMs)
        : null;
    try {
      const res = await fetch(url, { ...init, signal });
      return res;
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }

  private isRetriableStatus(status: number): boolean {
    return status >= 500 && status < 600;
  }

  private isRetriableError(error: unknown): boolean {
    return error instanceof TypeError;
  }

  private async request(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
  ): Promise<{ response: Response; text: string }> {
    const url = this.buildUrl(path);
    const headers = this.buildHeaders(
      body !== undefined ? { "Content-Type": "application/json" } : undefined,
    );

    const headerEntries = Array.from(headers.entries()).map(([name, value]) => ({
      name,
      value: name.toLowerCase() === "authorization" ? "<redacted>" : value,
    }));
    const serializedBody =
      body !== undefined ? JSON.stringify(body, null, 2) : undefined;
    logHttpDebug({
      phase: "request",
      method,
      url,
      headers: headerEntries,
      body: serializedBody,
    });

    let lastError: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const res = await this.doFetch(url, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        const text = await res.text();
        logHttpDebug({
          phase: "response",
          method,
          url,
          headers: Array.from(res.headers.entries()).map(([name, value]) => ({
            name,
            value,
          })),
          body: text || undefined,
          extra: { status: res.status },
        });
        if (!res.ok && this.isRetriableStatus(res.status) && attempt < this.maxRetries) {
          lastError = new Error(
            `HTTP ${res.status} ${res.statusText} for ${url}; retrying`,
          );
          continue;
        }
        return { response: res, text };
      } catch (err) {
        logHttpDebug({
          phase: "error",
          method,
          url,
          body: err instanceof Error ? err.message : String(err),
          extra: { attempt },
        });
        lastError = err;
        if (!this.isRetriableError(err) || attempt === this.maxRetries) {
          throw err;
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(String(lastError));
  }

  async getJson<T>(path: string): Promise<T> {
    const { response, text } = await this.request("GET", path);
    const contentType = response.headers.get("content-type") || "";
    try {
      return JSON.parse(text) as T;
    } catch (e) {
      throw new Error(
        `Decode error for ${this.buildUrl(path)}: ${(e as Error).message}; content-type=${contentType}; body=${text}`,
      );
    }
  }

  async postJson<T>(path: string, body: unknown): Promise<T> {
    const { response, text } = await this.request("POST", path, body);
    const contentType = response.headers.get("content-type") || "";
    try {
      return JSON.parse(text) as T;
    } catch (e) {
      throw new Error(
        `Decode error for ${this.buildUrl(path)}: ${(e as Error).message}; content-type=${contentType}; body=${text}`,
      );
    }
  }
}
