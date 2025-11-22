import type { Page } from "@playwright/test";
import { test, expect } from "./baseTest.js";
import {
  buildFrontendEntryUrl,
  waitForBackendCli,
  waitForSessionCount,
  sendMessageAndExpectAssistant,
  expectLatestAssistantMessage,
  resetBackendState,
  ensureCliVisible,
  createSessionViaUi,
  clickSessionEntry,
} from "./utils.js";

const FRONTEND_ENTRY_URL = buildFrontendEntryUrl();

test("sessions keep independent context", async ({ page, request }) => {
  await resetBackendState(request);
  await waitForBackendCli(request);
  await page.goto(FRONTEND_ENTRY_URL);
  await ensureCliVisible(page, 1);

  // Session 1 setup
  const session1Id = await createSessionViaUi(page, request, {
    workdir: "/tmp/session1",
  });
  expect(session1Id).toBeTruthy();
  await clickSessionEntry(page, session1Id!);
  await sendMessageAndExpectAssistant(
    page,
    session1Id!,
    "hallo, antworte mir bitte wenn ich frage welche session mit session1 und jetzt erstmal mit Okay.",
    /Okay/i,
  );

  // Session 2 setup
  const session2Id = await createSessionViaUi(page, request, {
    workdir: "/tmp/session2",
  });
  expect(session2Id).toBeTruthy();
  await clickSessionEntry(page, session2Id!);
  await sendMessageAndExpectAssistant(
    page,
    session2Id!,
    "hallo, antworte mir bitte wenn ich frage welche session mit session2 und jetzt erstmal mit Okay.",
    /Okay/i,
  );

  // Session context stays separated without toggling panels
  await clickSessionEntry(page, session1Id!);
  await expectLatestAssistantMessage(page, session1Id!, /Okay/i);
  await clickSessionEntry(page, session2Id!);
  await expectLatestAssistantMessage(page, session2Id!, /Okay/i);
  await expectNoSessionPlaceholder(page);
});

async function expectNoSessionPlaceholder(page: Page): Promise<void> {
  await expect(
    page.locator("text=Click + to create a new session."),
  ).toHaveCount(0, { timeout: 5_000 });
}
