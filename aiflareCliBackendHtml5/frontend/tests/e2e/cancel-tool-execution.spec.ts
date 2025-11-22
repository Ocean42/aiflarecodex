import { test, expect } from "./baseTest.js";
import {
  BACKEND_URL,
  buildFrontendEntryUrl,
  resetBackendState,
  waitForBackendCli,
  ensureCliVisible,
  waitForSessionCount,
  clickSessionEntry,
} from "./utils.js";

const FRONTEND_ENTRY_URL = buildFrontendEntryUrl();

test("user can cancel a long-running tool execution", async ({ page, request }) => {
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

  const startResponse = await request.post(
    `${BACKEND_URL}/api/debug/sessions/${sessionId}/run-long-task`,
  );
  expect(startResponse.ok()).toBeTruthy();

  const timelineSelector = `[data-testid='session-timeline-${sessionId}']`;
  const toolStart = page.locator(
    `${timelineSelector} [data-event-type='tool-start']`,
  );
  await expect(
    toolStart.filter({ hasText: "shell" }),
  ).toHaveCount(1, { timeout: 30_000 });

  const cancelButton = page.locator(".cancel-button");
  await expect(cancelButton).toBeVisible({ timeout: 10_000 });
  await cancelButton.click();

  const systemMessage = page
    .locator(
      `${timelineSelector} [data-event-type='message'][data-role='system']`,
    )
    .filter({ hasText: "canceled" });
  await expect(systemMessage.first()).toBeVisible({ timeout: 30_000 });

  const toolResult = page
    .locator(`${timelineSelector} [data-event-type='tool-result']`)
    .filter({ hasText: "shell" });
  await expect(toolResult.first()).toContainText("failed", { timeout: 30_000 });

  await expect(cancelButton).toBeHidden({ timeout: 15_000 });
});
