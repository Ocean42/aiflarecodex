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

test("assistant renders numbered items on separate lines", async ({ page, request }) => {
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
    [
      "Schreibe ein dreizeiliges Haiku über Git.",
      "Jede Zeile muss mit einem echten Zeilenumbruch getrennt sein (insgesamt genau drei Zeilen).",
      "Verzichte auf zusätzliche Einleitungen oder Abschlüsse.",
    ].join("\n"),
    /.+/,
    { timeout: 90_000 },
  );

  const assistantMessage = page
    .locator(
      `[data-testid='session-timeline-${sessionId}'] [data-event-type='message'][data-role='assistant']`,
    )
    .last();
  const lines = assistantMessage.locator("[data-message-line]");
  await expect(lines).toHaveCount(3, { timeout: 10_000 });
  const texts = await lines.allInnerTexts();
  expect(texts.every((entry) => entry.trim().length > 0)).toBe(true);
});
