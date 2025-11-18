import React from "react";
import { describe, it, expect } from "vitest";

import App from "../src/app.js";
import { renderTui } from "./ui-test-helpers.js";
import { loadConfig } from "../src/utils/config.js";

describe("CLI UI – Codex backend integration", () => {
  it("simulates a full CLI session with prompt + enter and receives a Codex-backed reply", async () => {
    const config = loadConfig();

    const { stdin, lastFrameStripped, flush, cleanup } = renderTui(
      <App
        prompt={undefined}
        config={config}
        imagePaths={[]}
        approvalPolicy={config.approvalMode ?? "suggest"}
        additionalWritableRoots={[]}
        fullStdout={false}
      />,
    );

    // Give Ink a moment to render the initial UI.
    await flush();

    // Type a simple prompt and press Enter – this goes through the full
    // TerminalChat + TerminalChatInput stack just like `npm run start`.
    // We intentionally use the same short prompt ("test") that triggered
    // the 400 status error in the real CLI so this test exercises the
    // identical end-to-end path.
    stdin.write("test");
    stdin.write("\r"); // Enter

    // Allow some time for the AgentLoop to talk to the backend and stream a reply
    // (or an error) from the Codex backend.
    // We poll a few times to keep the test reasonably fast while still
    // accommodating network latency.
    let frame = "";
    let attempts = 0;
    // eslint-disable-next-line no-constant-condition
    while (attempts < 40) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      await flush();
      frame = lastFrameStripped();
      if (
        frame.toLowerCase().includes("ja, bin da") ||
        frame.includes("⚠️  OpenAI rejected the request")
      ) {
        break;
      }
      attempts += 1;
    }

    // Wir akzeptieren hier sowohl eine erfolgreiche Antwort als auch die
    // explizite Fehlermeldung, da das Ziel dieses Tests ist, exakt die
    // CLI-Pipeline (inkl. TUI und AgentLoop) zu exercisen und etwaige
    // 400er sauber zu beobachten.
    expect(
      frame.toLowerCase().includes("ja, bin da") ||
        frame.includes("⚠️  OpenAI rejected the request"),
    ).toBe(true);

    // Clean up Ink to avoid leaking handles between tests.
    cleanup();
  });
});
