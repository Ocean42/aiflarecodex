import { test, expect } from "@playwright/test";
import {
  waitForBackendCli,
  registerCli,
  ensureCliVisible,
  expectCliInUi,
  buildFrontendEntryUrl,
  expectLogEntry,
} from "./utils.js";

const FRONTEND_ENTRY_URL = buildFrontendEntryUrl();

test("CLI list reflects newly registered CLI", async ({ page, request }) => {
  const existing = await waitForBackendCli(request);
  const newId = `cli_ui_${Date.now()}`;
  const label = "UI Test CLI";
  await registerCli(request, newId, label);

  await page.goto(FRONTEND_ENTRY_URL);
  await expect(page.getByRole("heading", { name: /Aiflare Frontend/ })).toBeVisible();
  await ensureCliVisible(page, existing.length + 1);
  await expectCliInUi(page, label);
  await expectLogEntry(page, "Synced backend state");
  const renderedCliCount = await page.locator("[data-testid='cli-list'] li").count();
  await expect(page.getByTestId("stats-cli")).toHaveText(
    `Connected CLIs: ${renderedCliCount}`,
  );
});
