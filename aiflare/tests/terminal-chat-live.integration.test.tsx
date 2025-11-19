import React from "react";
import { describe, it, expect } from "vitest";

import App from "../src/app.js";
import { renderTui } from "./ui-test-helpers.js";
import { loadConfig } from "../src/utils/config.js";
import { httpManager, type HttpEvent } from "../src/utils/http-manager.js";

async function waitForFrame(
  flush: () => Promise<void>,
  lastFrame: () => string,
  predicate: (frame: string) => boolean,
  maxAttempts = 60,
  delayMs = 200,
): Promise<string> {
  let last = "";
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    await flush();
    last = lastFrame();
    if (predicate(last)) {
      return last;
    }
  }
  throw new Error(`Timed out waiting for matching frame: ${last}`);
}

function renderApp(configOverrides?: (cfg: ReturnType<typeof loadConfig>) => void) {
  const config = loadConfig();
  if (configOverrides) {
    configOverrides(config);
  }
  return renderTui(
    <App
      prompt={undefined}
      config={config}
      imagePaths={[]}
      approvalPolicy={config.approvalMode ?? "suggest"}
      additionalWritableRoots={[]}
      fullStdout={false}
    />,
  );
}

describe("TerminalChat – live integration", () => {
  it("streams an assistant reply for a simple prompt", async () => {
    const events: Array<HttpEvent> = [];
    const unsubscribe = httpManager.addListener((event) => events.push(event));

    const { stdin, lastFrameStripped, flush, cleanup } = renderApp();
    await flush();

    stdin.write("Sag bitte genau 'ja, bin da'.");
    stdin.write("\r");

    const frame = await waitForFrame(
      flush,
      lastFrameStripped,
      (out) =>
        out.toLowerCase().includes("ja, bin da") ||
        out.includes("⚠️  OpenAI rejected the request"),
    );

    expect(
      frame.toLowerCase().includes("ja, bin da") ||
        frame.includes("⚠️  OpenAI rejected the request"),
    ).toBe(true);

    cleanup();
    unsubscribe();

    const responsePosts = events.filter(
      (event) =>
        event.type === "request" &&
        event.method === "POST" &&
        event.url.includes("/responses"),
    );
    expect(responsePosts.length).toBeGreaterThan(0);
  });

  it("renders plan updates emitted by the agent", async () => {
    const { stdin, lastFrameStripped, flush, cleanup } = renderApp();

    await flush();

    stdin.write("/plan-test");
    stdin.write("\r");

    const planFrame = await waitForFrame(
      flush,
      lastFrameStripped,
      (out) => out.includes("Plan update:"),
      30,
      200,
    );

    expect(planFrame).toContain("Plan update:");

    cleanup();
  }, 10_000);

  it("can read a repository file when asked naturally", async () => {
    const { stdin, lastFrameStripped, flush, cleanup } = renderApp();
    await flush();

    stdin.write(
      "Schau dir bitte die Datei README.md im aktuellen Arbeitsverzeichnis an und bestätige, dass 'OpenAI Codex CLI' darin vorkommt.",
    );
    stdin.write("\r");

    const frame = await waitForFrame(
      flush,
      lastFrameStripped,
      (out) =>
        out.includes("Datei README.md enthält 'OpenAI Codex CLI':") ||
        (out.includes("command.stdout") && out.includes("README.md")),
      30,
      200,
    );

    expect(
      frame.includes("Datei README.md enthält 'OpenAI Codex CLI':") ||
        frame.includes("<h1 align=\"center\">OpenAI Codex CLI</h1>") ||
        (frame.includes("command.stdout") && frame.includes("README.md")),
    ).toBe(true);

    cleanup();
  }, 10_000);

  it("shows real rate limit information in the /status overlay", async () => {
    const events: Array<HttpEvent> = [];
    const unsubscribe = httpManager.addListener((event) => events.push(event));

    const { stdin, lastFrameStripped, flush, cleanup } = renderApp();
    await flush();

    stdin.write("/status");
    stdin.write("\r");

    const statusFrame = await waitForFrame(
      flush,
      lastFrameStripped,
      (out) => out.includes("Codex CLI (aiflare-codey) version"),
      150,
      200,
    );

    expect(statusFrame).toContain("Codex CLI (aiflare-codey) version");
    expect(statusFrame).toMatch(/Primary .*limit/i);

    cleanup();
    unsubscribe();

    const rateLimitRequests = events.filter(
      (event) =>
        event.type === "request" &&
        event.method === "GET" &&
        (event.url.includes("/wham/usage") ||
          event.url.includes("/api/codex/usage")),
    );
    expect(rateLimitRequests.length).toBeGreaterThan(0);
  }, 40_000);
});
