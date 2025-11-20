import { test, expect } from "@playwright/test";
import {
  waitForBackendCli,
  waitForSessionViaApi,
  pollForNoActions,
  ensureCliVisible,
  buildFrontendEntryUrl,
  expectLogEntry,
  expectLogCount,
} from "./utils.js";

const FRONTEND_ENTRY_URL = buildFrontendEntryUrl();

test("create session and process actions", async ({ page, request }) => {
  page.on("console", (msg) => {
    console.log("[browser]", msg.text());
  });
  page.on("requestfailed", (req) => {
    console.log("[request failed]", req.url(), req.failure()?.errorText);
  });

  const cliIds = await waitForBackendCli(request);
  console.log("[api] backend clis", cliIds);
  await page.goto(FRONTEND_ENTRY_URL);
  await expect(page.getByRole("heading", { name: /Aiflare Frontend/ })).toBeVisible();
  await ensureCliVisible(page, cliIds.length);
  await expectLogEntry(page, "Synced backend state");
  const statsCliText = await page.getByTestId("stats-cli").textContent();
  const statsCliCount = Number(statsCliText?.match(/\d+/)?.[0] ?? "0");
  expect(statsCliCount).toBeGreaterThanOrEqual(cliIds.length);

  await page.getByRole("button", { name: "Create Session" }).click();
  const sessionId = await waitForSessionViaApi(request);
  console.log("[api] session created", sessionId);

  await page.getByRole("button", { name: "Enqueue Sample Action" }).click();
  await pollForNoActions(request);
  await expectLogCount(page, 3);
  const sessionEntry = page
    .locator("[data-testid='session-list'] li")
    .filter({ hasText: sessionId });
  await expect(sessionEntry).toBeVisible({ timeout: 15_000 });
  await sessionEntry.getByRole("button").click();
  const historyEntries = page
    .locator("[data-testid='session-history'] li")
    .filter({ hasText: "action_acknowledged" });
  await expect(historyEntries.first()).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("[data-testid='pending-actions'] li")).toHaveCount(0, {
    timeout: 15_000,
  });
  await expectLogEntry(page, "actions=0");
});
