import { test, expect, type Page } from "@playwright/test";
import {
  buildFrontendEntryUrl,
  waitForBackendCli,
  waitForSessionCount,
  clickSessionEntry,
  toggleSessionFromNavigator,
  resetBackendState,
} from "./utils.js";

const FRONTEND_ENTRY_URL = buildFrontendEntryUrl();

function sessionInputTestId(sessionId: string): string {
  return `session-input-${sessionId}`;
}

function sessionTabLocator(page: Page, sessionId: string) {
  return page
    .locator('[data-testid="session-workspace"] .dv-tab')
    .filter({ hasText: sessionId });
}

test("session navigator toggles dockview panels", async ({ page, request }) => {
  await resetBackendState(request);
  await waitForBackendCli(request);
  await page.goto(FRONTEND_ENTRY_URL);

  // Create two sessions and open their panels
  await page.getByRole("button", { name: "Create Session" }).click();
  const sessionsAfterFirst = await waitForSessionCount(request, 1);
  const session1Id = sessionsAfterFirst[sessionsAfterFirst.length - 1]?.id;
  expect(session1Id).toBeTruthy();
  await clickSessionEntry(page, session1Id!);

  await page.getByRole("button", { name: "Create Session" }).click();
  const sessionsAfterSecond = await waitForSessionCount(request, 2);
  const session2Id = sessionsAfterSecond[sessionsAfterSecond.length - 1]?.id;
  expect(session2Id).toBeTruthy();
  await clickSessionEntry(page, session2Id!);

  await expect(sessionTabLocator(page, session1Id!)).toBeVisible();
  await expect(sessionTabLocator(page, session2Id!)).toBeVisible();

  // Tabs switch focus without closing
  await clickSessionEntry(page, session1Id!);
  await expect(page.getByTestId(sessionInputTestId(session1Id!))).toBeVisible();
  await clickSessionEntry(page, session2Id!);
  await expect(page.getByTestId(sessionInputTestId(session2Id!))).toBeVisible();

  // Clicking navigator entry closes a session without affecting the other
  await toggleSessionFromNavigator(page, session1Id!);
  await expect(sessionTabLocator(page, session1Id!)).toHaveCount(0);
  await expect(page.getByTestId(sessionInputTestId(session2Id!))).toBeVisible();

  // Reopen the first session and verify placeholder after all closed
  await clickSessionEntry(page, session1Id!);
  await expect(sessionTabLocator(page, session1Id!)).toBeVisible();
  await toggleSessionFromNavigator(page, session1Id!);
  await expect(sessionTabLocator(page, session1Id!)).toHaveCount(0);
  await toggleSessionFromNavigator(page, session2Id!);
  await expect(sessionTabLocator(page, session2Id!)).toHaveCount(0);
  await expect(page.locator("text=Select a session to start chatting.")).toBeVisible();
});
