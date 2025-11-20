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

const PROMPT = "Sag bitte genau 'ja, bin da'.";

describe.sequential("TerminalChat – Scenario A (live agent turn)", () => {
  it(
    "streams an assistant reply and records HTTP events",
    async () => {
      const config = loadConfig();
      const recorded: Array<HttpEvent> = [];
      const unsubscribe = httpManager.addListener((event) => {
        recorded.push(event);
      });

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
        stdin.write(PROMPT);
        await flush();
        stdin.write("\r");

        const frame = await waitForFrame(
          () => lastFrameStripped().toLowerCase(),
          flush,
          (output) =>
            output.includes("ja, bin da") ||
            output.includes("⚠️  openai rejected the request".toLowerCase()),
        );

        expect(
          frame.includes("ja, bin da") ||
            frame.includes("⚠️  openai rejected the request"),
        ).toBe(true);

        const responseRequests = recorded.filter(
          (event): event is HttpRequestEvent =>
            event.type === "request" &&
            event.method === "POST" &&
            /\/responses/i.test(event.url),
        );
        expect(responseRequests.length).toBeGreaterThan(0);
        expect(
          responseRequests.some((req) =>
            req.bodySummary?.toLowerCase().includes("ja, bin da"),
          ),
        ).toBe(true);
      } finally {
        unsubscribe();
        try {
          stdin.write("\u0003");
          await flush();
        } catch {
          // ignore – Ink will be cleaned up below.
        }
        cleanup();
      }
    },
    180_000,
  );
});
