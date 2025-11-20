import React from "react";
import { describe, it, expect } from "vitest";

import App from "../src/app.js";
import { loadConfig } from "../src/utils/config.js";
import {
  httpManager,
  type HttpEvent,
  type HttpRequestEvent,
} from "../src/utils/http-manager.js";
import { renderTui } from "./ui-test-helpers.js";
import { waitForFrame } from "./ink-live-helpers.js";

describe.sequential("TerminalChat – Scenario C (/status overlay)", () => {
  it(
    "shows live backend status and performs a rate-limit request",
    async () => {
      const config = loadConfig();
      const events: Array<HttpEvent> = [];
      const unsubscribe = httpManager.addListener((event) => events.push(event));

      const { stdin, lastFrameStripped, flush, cleanup } = renderTui(
        <App
          config={config}
          approvalPolicy="suggest"
          additionalWritableRoots={[]}
          fullStdout={false}
        />,
      );

      try {
        await flush();
        stdin.write("/status");
        await flush();
        stdin.write("\r");

        const statusFrame = await waitForFrame(
          () => lastFrameStripped().toLowerCase(),
          flush,
          (frame) =>
            frame.includes("auth:") &&
            (frame.includes("rate limits") ||
              frame.includes("visit https://chatgpt.com/codex/settings/usage")),
          { timeoutMs: 60_000, intervalMs: 250 },
        );
        expect(statusFrame).toContain("auth:");
        const rateLimitRequest = await waitForRateLimitRequest(() => events);
        expect(rateLimitRequest).toBeDefined();
      } finally {
        unsubscribe();
        try {
          stdin.write("\u0003");
          await flush();
        } catch {
          // ignore cleanup errors
        }
        cleanup();
      }
    },
    180_000,
  );
});

async function waitForRateLimitRequest(
  getEvents: () => Array<HttpEvent>,
  timeoutMs = 30_000,
  intervalMs = 200,
): Promise<HttpRequestEvent | undefined> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const match = getEvents().find(
      (event): event is HttpRequestEvent =>
        event.type === "request" &&
        event.method === "GET" &&
        /\/(api\/codex\/usage|wham\/usage)/i.test(event.url),
    );
    if (match) {
      return match;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return undefined;
}
