// @ts-nocheck
function headersToObject(headers) {
    if (!headers) {
        return {};
    }
    const map = {};
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
        }
        else if (typeof value === "string") {
            map[name.toLowerCase()] = value;
        }
    }
    return map;
}
function describeBody(body) {
    if (body == null) {
        return undefined;
    }
    if (typeof body === "string") {
        return body.length > 200 ? `${body.slice(0, 200)}…` : body;
    }
    if (body instanceof URLSearchParams) {
        return body.toString();
    }
    if (typeof Buffer !== "undefined" &&
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        typeof Buffer.isBuffer === "function" &&
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        Buffer.isBuffer(body)) {
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
function normalizeMethod(method) {
    return (method ?? "GET").toUpperCase();
}
function extractUrl(input) {
    if (typeof input === "string") {
        return input;
    }
    if (input instanceof URL) {
        return input.toString();
    }
    return input.url;
}
function extractHeaders(input, init) {
    if (init?.headers) {
        return init.headers;
    }
    if (typeof input === "string" || input instanceof URL) {
        return {};
    }
    return input.headers;
}
function extractBody(input, init) {
    if (typeof init?.body !== "undefined") {
        return init.body;
    }
    if (typeof input === "string" || input instanceof URL) {
        return undefined;
    }
    return input.body;
}
export class HttpManager {
    listeners = new Set();
    baseFetch = null;
    originalFetch = null;
    requestCounter = 0;
    installed = false;
    constructor() {
        if (typeof globalThis.fetch === "function") {
            this.baseFetch = globalThis.fetch.bind(globalThis);
            this.originalFetch = this.baseFetch;
        }
    }
    installGlobalHook() {
        if (this.installed || typeof globalThis.fetch !== "function") {
            return;
        }
        this.installed = true;
        const wrapped = this.fetch.bind(this);
        globalThis.fetch = wrapped;
    }
    addListener(listener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }
    /**
     * Test-only helper to stub the underlying fetch implementation.
     */
    setBaseFetchForTests(fn) {
        this.baseFetch = fn;
    }
    resetBaseFetch() {
        this.baseFetch = this.originalFetch;
    }
    async fetch(input, init) {
        if (!this.baseFetch) {
            throw new Error("fetch is not available in this environment");
        }
        const requestId = ++this.requestCounter;
        const url = extractUrl(input);
        const method = normalizeMethod(init?.method ?? input?.method);
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
            const response = await this.baseFetch(input, init);
            const durationRaw = typeof performance !== "undefined" ? performance.now() - start : Date.now() - start;
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
        }
        catch (error) {
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
    emit(event) {
        for (const listener of this.listeners) {
            try {
                listener(event);
            }
            catch {
                // Best-effort logging; swallow listener errors so we don't break fetch calls.
            }
        }
    }
}
export const httpManager = new HttpManager();
httpManager.installGlobalHook();
