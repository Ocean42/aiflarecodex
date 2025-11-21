import { test, expect } from "@playwright/test";
import {
  buildFrontendEntryUrl,
  waitForBackendCli,
  waitForSessionCount,
  clickSessionEntry,
  resetBackendState,
  expectLatestAssistantMessage,
  getAssistantChunkCount,
} from "./utils.js";

const FRONTEND_ENTRY_URL = buildFrontendEntryUrl();

test("frontend receives the same number of message updates as backend stream chunks", async ({
  page,
  request,
}) => {
  await resetBackendState(request);
  await waitForBackendCli(request);
  await page.goto(FRONTEND_ENTRY_URL);

  await page.getByRole("button", { name: "Create Session" }).click();
  const sessions = await waitForSessionCount(request, 1);
  const sessionId = sessions[sessions.length - 1]?.id;
  expect(sessionId).toBeTruthy();
  await clickSessionEntry(page, sessionId!);

  const prompt =
    "suche nach einer katze und beschreibe sie ausführlich, schreibe langsam und Abschnitt für Abschnitt.";
  const input = page.getByTestId(`session-input-${sessionId}`);
  const sendButton = page.getByTestId(`session-send-${sessionId}`);
  await input.fill(prompt);
  await sendButton.click();

  await expectLatestAssistantMessage(page, sessionId!, /katze/i, {
    timeout: 60_000,
  });

  const backendChunks = await getAssistantChunkCount(request, sessionId!);
  const frontendUpdates = await page.evaluate((sid) => {
    return window.getSessionMessageUpdateCount?.(sid) ?? 0;
  }, sessionId!);

  expect(frontendUpdates, `backendChunks=${backendChunks} frontendUpdates=${frontendUpdates}`).toBe(
    backendChunks,
  );
});
