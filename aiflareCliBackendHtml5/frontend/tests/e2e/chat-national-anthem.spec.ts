import { test, expect } from "./baseTest.js";
import {
  buildFrontendEntryUrl,
  clickSessionEntry,
  resetBackendState,
  sendMessageAndExpectAssistant,
  waitForBackendCli,
  waitForSessionCount,
  ensureCliVisible,
  getAssistantMessages,
} from "./utils.js";

const FRONTEND_ENTRY_URL = buildFrontendEntryUrl();

test("AI returns all verses of the US national anthem", async ({ page, request }) => {
  await resetBackendState(request);
  await waitForBackendCli(request);
  await page.goto(FRONTEND_ENTRY_URL);
  await ensureCliVisible(page, 1);

  await page.getByRole("button", { name: "Create Session" }).click();
  const sessions = await waitForSessionCount(request, 1);
  const sessionId = sessions[sessions.length - 1]!.id;
  await clickSessionEntry(page, sessionId);

  await sendMessageAndExpectAssistant(
    page,
    sessionId,
    [
      "Bitte gib mir den vollständigen, unveränderten englischen Originaltext",
      "der US-Nationalhymne „The Star-Spangled Banner“ mit exakt 4 Strophen.",
      "Schreibe jede Strophe nummeriert aus (1. … 4. …) und lasse nichts aus.",
    ].join(" "),
    /say can you see/i,
    { captureText: false, timeout: 60_000 },
  );
  const assistantMessages = getAssistantMessages(page, sessionId);
  const finalMessage = assistantMessages.last();
  await expect(finalMessage).toContainText(/in triumph shall wave/i, { timeout: 60_000 });
  const text = await finalMessage.innerText();

  await test.step("contains opening line", async () => {
    expect(text).toMatch(/say can you see/i);
  });

  await test.step("contains third verse shoreline", async () => {
    expect(text).toMatch(/on the shore dimly/i);
  });

  await test.step("contains vaunting band reference", async () => {
    expect(text).toMatch(/\b(?:that|hat) band who so vauntingly/i);
  });

  await test.step("contains closing refrain", async () => {
    expect(text).toMatch(/in triumph shall wave/i);
  });
});
