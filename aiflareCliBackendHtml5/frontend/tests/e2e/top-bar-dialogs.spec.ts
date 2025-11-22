import { test, expect } from "./baseTest.js";
import {
  buildFrontendEntryUrl,
  resetBackendState,
  waitForBackendCli,
} from "./utils.js";

const FRONTEND_ENTRY_URL = buildFrontendEntryUrl();

test("top bar renders brand and toggles dialogs", async ({ page, request }) => {
  await resetBackendState(request);
  await waitForBackendCli(request);
  await page.goto(FRONTEND_ENTRY_URL);

  const topBar = page.getByTestId("top-bar");
  await expect(topBar).toBeVisible({ timeout: 15_000 });
  await expect(topBar).toContainText("AgentMan");

  const cliToggle = page.getByTestId("topbar-clis-toggle");
  const logsToggle = page.getByTestId("topbar-logs-toggle");
  const minimizedToggle = page.getByTestId("topbar-minimized-toggle");
  await expect(cliToggle).toBeVisible();
  await expect(logsToggle).toBeVisible();
  await expect(minimizedToggle).toBeVisible();

  const cliBadge = page.getByTestId("topbar-clis-badge");
  await expect(cliBadge).toHaveText(/1|2|3|4|5|6|7|8|9/);

  await cliToggle.click();
  const cliDialog = page.getByTestId("topbar-clis-modal");
  await expect(cliDialog).toBeVisible({ timeout: 5_000 });
  await cliDialog.getByRole("button", { name: "Close" }).click();
  await expect(cliDialog).toBeHidden();

  await logsToggle.click();
  const logsDialog = page.getByTestId("topbar-logs-modal");
  await expect(logsDialog).toBeVisible({ timeout: 5_000 });
  await logsDialog.getByRole("button", { name: "Close" }).click();
  await expect(logsDialog).toBeHidden();

  await minimizedToggle.click();
  const minimizedDialog = page.getByTestId("topbar-minimized-modal");
  await expect(minimizedDialog).toBeVisible({ timeout: 5_000 });
  await minimizedDialog.getByRole("button", { name: "Close" }).click();
  await expect(minimizedDialog).toBeHidden();
});
