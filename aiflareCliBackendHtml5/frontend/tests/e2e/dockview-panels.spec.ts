import type { Page } from "@playwright/test";
import { test, expect } from "./baseTest.js";
import {
  buildFrontendEntryUrl,
  waitForBackendCli,
  clickSessionEntry,
  resetBackendState,
  ensureCliVisible,
  createSessionViaUi,
} from "./utils.js";

const FRONTEND_ENTRY_URL = buildFrontendEntryUrl();

function sessionInputTestId(sessionId: string): string {
  return `session-input-${sessionId}`;
}

async function closeSessionTab(page: Page, sessionId: string): Promise<void> {
  const tab = page
    .locator('[data-testid="session-workspace"] .dv-default-tab')
    .filter({ hasText: sessionId.slice(0, 6) });
  await expect(tab.first()).toBeVisible({ timeout: 15_000 });
  const minimizedModal = page.getByTestId("topbar-minimized-modal");
  if (await minimizedModal.isVisible().catch(() => false)) {
    await minimizedModal.getByRole("button", { name: "Close" }).click();
    await expect(minimizedModal).toBeHidden();
  }
  const closeButton = tab.first().locator(".dv-default-tab-action");
  await tab.first().hover();
  await closeButton.click();
}

test("dockview tabs close to minimized and can be restored", async ({ page, request }) => {
  await resetBackendState(request);
  await waitForBackendCli(request);
  await page.goto(FRONTEND_ENTRY_URL);
  await ensureCliVisible(page, 1);

  // Create two sessions in dock
  const session1Id = await createSessionViaUi(page, request, {
    workdir: "/tmp/dock-d1",
  });
  expect(session1Id).toBeTruthy();
  await clickSessionEntry(page, session1Id!);

  const session2Id = await createSessionViaUi(page, request, {
    workdir: "/tmp/dock-d2",
  });
  expect(session2Id).toBeTruthy();
  await clickSessionEntry(page, session2Id!);

  // Tabs switch focus without closing
  await clickSessionEntry(page, session1Id!);
  await expect(page.getByTestId(sessionInputTestId(session1Id!))).toBeVisible();
  await clickSessionEntry(page, session2Id!);
  await expect(page.getByTestId(sessionInputTestId(session2Id!))).toBeVisible();

  // Closing moves to minimized
  await closeSessionTab(page, session1Id!);
  await expect(page.getByTestId(sessionInputTestId(session1Id!))).toHaveCount(0);
  await expect(page.getByTestId("topbar-minimized-badge")).toHaveText(/1/);

  // Restore from minimized dialog
  await page.getByTestId("topbar-minimized-toggle").click();
  const minimizedDialog = page.getByTestId("topbar-minimized-modal");
  await expect(minimizedDialog).toBeVisible({ timeout: 5_000 });
  await minimizedDialog.getByTestId(`restore-session-${session1Id!}`).click();
  await expect(page.getByTestId(sessionInputTestId(session1Id!))).toBeVisible({
    timeout: 10_000,
  });

  // Close all and expect placeholder
  await closeSessionTab(page, session1Id!);
  await closeSessionTab(page, session2Id!);
  await expect(
    page.locator('[data-testid="session-workspace"] .dv-default-tab'),
  ).toHaveCount(0);
  await expect(page.getByTestId("session-create-panel")).toHaveCount(0);
});
