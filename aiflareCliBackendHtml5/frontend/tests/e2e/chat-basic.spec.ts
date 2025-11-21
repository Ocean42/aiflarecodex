import { test, expect } from "@playwright/test";
import {
  buildFrontendEntryUrl,
  waitForBackendCli,
  waitForSessionCount,
  clickSessionEntry,
  sendMessageAndExpectAssistant,
  resetBackendState,
} from "./utils.js";

const FRONTEND_ENTRY_URL = buildFrontendEntryUrl();

test("single session responds with Hallo", async ({ page, request }) => {
  await resetBackendState(request);
  await waitForBackendCli(request);
  await page.goto(FRONTEND_ENTRY_URL);

  await page.getByRole("button", { name: "Create Session" }).click();
  await waitForSessionCount(request, 1);
  const latestSessions = await waitForSessionCount(request, 1);
  const sessionId = latestSessions[latestSessions.length - 1]?.id as string;
  await clickSessionEntry(page, sessionId);

  await sendMessageAndExpectAssistant(
    page,
    sessionId,
    "hi ai antworte mir bitte mit hallo",
    /hallo/i,
  );
});
