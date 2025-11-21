import { test, expect } from "@playwright/test";
import {
  buildFrontendEntryUrl,
  clickSessionEntry,
  resetBackendState,
  sendMessageAndExpectAssistant,
  waitForBackendCli,
  waitForSessionCount,
} from "./utils.js";

const FRONTEND_ENTRY_URL = buildFrontendEntryUrl();

test("AI returns all verses of the US national anthem", async ({ page, request }) => {
  await resetBackendState(request);
  await waitForBackendCli(request);
  await page.goto(FRONTEND_ENTRY_URL);

  await page.getByRole("button", { name: "Create Session" }).click();
  const sessions = await waitForSessionCount(request, 1);
  const sessionId = sessions[sessions.length - 1]!.id;
  await clickSessionEntry(page, sessionId);

  const result = await sendMessageAndExpectAssistant(
    page,
    sessionId,
    "gib die nationalhymne der usa mit allen strophen",
    /say can you see/i,
    { captureText: true, timeout: 60_000 },
  );
  expect(result).toBeDefined();
  const text = result!.text;

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
