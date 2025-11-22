import { test, expect } from "./baseTest.js";
import {
  buildFrontendEntryUrl,
  resetBackendState,
  waitForBackendCli,
  ensureCliVisible,
  waitForSessionCount,
  clickSessionEntry,
  sendMessageAndExpectAssistant,
} from "./utils.js";

const FRONTEND_ENTRY_URL = buildFrontendEntryUrl();

test("assistant produces only one final message per prompt", async ({ page, request }) => {
  await resetBackendState(request);
  await waitForBackendCli(request);
  await page.goto(FRONTEND_ENTRY_URL);
  await ensureCliVisible(page, 1);

  await page.getByRole("button", { name: "Create Session" }).click();
  const sessions = await waitForSessionCount(request, 1);
  const sessionId = sessions[sessions.length - 1]?.id;
  if (!sessionId) {
    throw new Error("session creation failed");
  }
  await clickSessionEntry(page, sessionId);

  await sendMessageAndExpectAssistant(
    page,
    sessionId,
    "Bitte sag mir kurz hallo.",
    /hallo/i,
    { timeout: 60_000 },
  );

  const assistantMessages = page.locator(
    `[data-testid='session-timeline-${sessionId}'] [data-event-type='message'][data-role='assistant']`,
  );

  await page.waitForTimeout(1500);
  await expect(assistantMessages).toHaveCount(1);
  const text = (await assistantMessages.first().innerText()).toLowerCase();
  const halloMatches = text.match(/hallo/g) ?? [];
  expect(halloMatches.length).toBe(1);
});
