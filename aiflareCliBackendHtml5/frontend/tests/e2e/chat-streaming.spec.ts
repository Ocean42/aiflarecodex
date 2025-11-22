import { test, expect } from "./baseTest.js";
import {
  buildFrontendEntryUrl,
  waitForBackendCli,
  clickSessionEntry,
  resetBackendState,
  expectLatestAssistantMessage,
  getAssistantChunkCount,
  ensureCliVisible,
  createSessionViaUi,
} from "./utils.js";

const FRONTEND_ENTRY_URL = buildFrontendEntryUrl();

test("frontend receives the same number of message updates as backend stream chunks", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  await resetBackendState(request);
  await waitForBackendCli(request);
  await page.goto(FRONTEND_ENTRY_URL);
  await ensureCliVisible(page, 1);

  const sessionId = await createSessionViaUi(page, request);
  expect(sessionId).toBeTruthy();
  await clickSessionEntry(page, sessionId!);

  const prompt =
    "Beschreibe eine fiktive Hauskatze freundlich in mehreren Sätzen, schreibe langsam und Abschnitt für Abschnitt.";
  const input = page.getByTestId(`session-input-${sessionId}`);
  const sendButton = page.getByTestId(`session-send-${sessionId}`);
  await input.fill(prompt);
  await sendButton.click();

  await expectLatestAssistantMessage(page, sessionId!, /.+/i, {
    timeout: 90_000,
  });

  const backendChunks = await getAssistantChunkCount(request, sessionId!);
  const frontendUpdates = await page.evaluate((sid) => {
    return window.getSessionTimelineUpdateCount?.(sid) ?? 0;
  }, sessionId!);

  expect(
    frontendUpdates,
    `backendChunks=${backendChunks} frontendUpdates=${frontendUpdates}`,
  ).toBeGreaterThanOrEqual(backendChunks);
  expect(Math.abs(frontendUpdates - backendChunks)).toBeLessThanOrEqual(5);
});
