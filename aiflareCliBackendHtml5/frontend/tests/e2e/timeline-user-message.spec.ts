import { test, expect } from "./baseTest.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildFrontendEntryUrl,
  waitForBackendCli,
  waitForSessionCount,
  clickSessionEntry,
  sendMessageAndExpectAssistant,
  resetBackendState,
  ensureCliVisible,
} from "./utils.js";

const FRONTEND_ENTRY_URL = buildFrontendEntryUrl();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../..");
const examplesWorkdir = path.join(repoRoot, "examples");

test("user message appears once in timeline", async ({ page, request }) => {
  await resetBackendState(request);
  await waitForBackendCli(request);
  await page.goto(FRONTEND_ENTRY_URL);
  await ensureCliVisible(page, 1);

  await page.getByLabel("Workdir:").fill(examplesWorkdir);
  await page.getByRole("button", { name: "Create Session" }).click();
  const sessions = await waitForSessionCount(request, 1);
  const sessionId = sessions[sessions.length - 1]?.id;
  expect(sessionId).toBeTruthy();
  await clickSessionEntry(page, sessionId!);

  await sendMessageAndExpectAssistant(
    page,
    sessionId!,
    "Sag mir kurz hallo.",
    /hallo|hello|hi/i,
    { timeout: 90_000 },
  );

  const userMessages = page.locator(
    `[data-testid='session-timeline-${sessionId}'] [data-event-type='message'][data-role='user']`,
  );
  await expect(userMessages).toHaveCount(1, { timeout: 15_000 });
});
