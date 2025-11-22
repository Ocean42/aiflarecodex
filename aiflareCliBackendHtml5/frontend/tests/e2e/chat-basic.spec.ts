import { test, expect } from "./baseTest.js";
import {
  buildFrontendEntryUrl,
  waitForBackendCli,
  clickSessionEntry,
  sendMessageAndExpectAssistant,
  resetBackendState,
  ensureCliVisible,
  createSessionViaUi,
} from "./utils.js";

const FRONTEND_ENTRY_URL = buildFrontendEntryUrl();

test("single session responds with Hallo", async ({ page, request }) => {
  await resetBackendState(request);
  await waitForBackendCli(request);
  await page.goto(FRONTEND_ENTRY_URL);
  await ensureCliVisible(page, 1);

  const sessionId = await createSessionViaUi(page, request);
  await clickSessionEntry(page, sessionId);

  await sendMessageAndExpectAssistant(
    page,
    sessionId,
    "hi ai antworte mir bitte mit hallo",
    /hallo/i,
  );
});
