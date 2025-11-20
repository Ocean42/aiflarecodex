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

const FOLLOW_UP_PROMPT = "Bitte bestätige einfach nur mit 'Plan bestätigt'.";

describe.sequential("TerminalChat – Scenario B (plan update flow)", () => {
  it(
    "renders test plan updates and continues with a live turn",
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
        stdin.write("/plan-test");
        await flush();
        stdin.write("\r");

        const planFrame = await waitForFrame(
          () => lastFrameStripped(),
          flush,
          (frame) => frame.includes("Plan update:"),
          { timeoutMs: 30_000, intervalMs: 200 },
        );
        expect(planFrame).toContain("[ ] Analyse the user request");

        stdin.write(FOLLOW_UP_PROMPT);
        await flush();
        stdin.write("\r");

        const replyFrame = await waitForFrame(
          () => lastFrameStripped().toLowerCase(),
          flush,
          (frame) =>
            frame.includes("plan bestätigt") ||
            frame.includes("⚠️  openai rejected the request".toLowerCase()),
        );
        expect(
          replyFrame.includes("plan bestätigt") ||
            replyFrame.includes("⚠️  openai rejected the request"),
        ).toBe(true);

        const responseRequests = events.filter(
          (event): event is HttpRequestEvent =>
            event.type === "request" &&
            event.method === "POST" &&
            /\/responses/i.test(event.url),
        );
        expect(responseRequests.length).toBeGreaterThan(0);
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
