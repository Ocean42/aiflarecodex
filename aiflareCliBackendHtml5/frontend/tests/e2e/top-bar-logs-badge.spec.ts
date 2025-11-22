import { test, expect } from "./baseTest.js";
import type { Page } from "@playwright/test";
import {
  buildFrontendEntryUrl,
  ensureCliVisible,
  resetBackendState,
  waitForBackendCli,
  waitForSessionCount,
} from "./utils.js";

const FRONTEND_ENTRY_URL = buildFrontendEntryUrl();

async function readBadgeCount(page: Page): Promise<number> {
  const text = await page.getByTestId("topbar-logs-badge").innerText();
  const numeric = parseInt(text.replace(/\D+/g, ""), 10);
  if (Number.isNaN(numeric)) {
    return 0;
  }
  return numeric;
}

test("logs badge updates after session creation and dialog shows entries", async ({
  page,
  request,
}) => {
  await resetBackendState(request);
  await waitForBackendCli(request);
  await page.goto(FRONTEND_ENTRY_URL);
  await ensureCliVisible(page, 1);

  const initialCount = await readBadgeCount(page);

  await page.getByRole("button", { name: "Create Session" }).click();
  const sessions = await waitForSessionCount(request, 1);
  const sessionId = sessions[sessions.length - 1]?.id ?? "";

  await expect
    .poll(async () => await readBadgeCount(page), { timeout: 10_000 })
    .toBeGreaterThan(initialCount);

  await page.getByTestId("topbar-logs-toggle").click();
  const dialog = page.getByTestId("topbar-logs-modal");
  await expect(dialog).toBeVisible({ timeout: 5_000 });
  await expect(dialog.locator("li").first()).toContainText("session");
  if (sessionId) {
    await expect(dialog).toContainText(sessionId);
  }
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();
});
