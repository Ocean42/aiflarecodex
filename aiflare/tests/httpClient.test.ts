import { describe, it, expect, vi, beforeEach } from "vitest";

import { HttpClient } from "../src/backend/httpClient.js";

const originalFetch = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = originalFetch;
});

describe("HttpClient", () => {
  it("performs a simple GET and parses JSON", async () => {
    const mockResponse = { ok: true, status: 200, statusText: "OK" };
    const body = JSON.stringify({ hello: "world" });

    globalThis.fetch = vi.fn(async () => {
      return {
        ok: mockResponse.ok,
        status: mockResponse.status,
        statusText: mockResponse.statusText,
        headers: new Headers({ "content-type": "application/json" }),
        text: async () => body,
      } as any;
    }) as any;

    const client = new HttpClient({ baseUrl: "https://example.com" });
    const json = await client.getJson<{ hello: string }>("/foo");
    expect(json.hello).toBe("world");
  });

  it("retries on network errors up to maxRetries", async () => {
    const fetchSpy = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("network down"))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers({ "content-type": "application/json" }),
        text: async () => "{}",
      } as any);

    globalThis.fetch = fetchSpy as any;

    const client = new HttpClient({ baseUrl: "https://example.com", maxRetries: 2 });
    const json = await client.getJson<Record<string, never>>("/foo");
    expect(json).toEqual({});
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});

