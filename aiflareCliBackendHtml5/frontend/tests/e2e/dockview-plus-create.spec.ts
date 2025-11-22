import { test, expect } from "./baseTest.js";
import {
  buildFrontendEntryUrl,
  resetBackendState,
  waitForBackendCli,
  waitForSessionCount,
} from "./utils.js";

const FRONTEND_ENTRY_URL = buildFrontendEntryUrl();

test("dockview + spawns create panels and preserves existing forms", async ({ page, request }) => {
  await resetBackendState(request);
  const clis = await waitForBackendCli(request);
  const cliId = clis[0]!;

  await page.goto(FRONTEND_ENTRY_URL);

  const addButton = page.getByTestId("dockview-add-panel");
  await expect(addButton).toBeVisible();
  await expect(page.getByTestId("session-create-panel")).toHaveCount(0);

  await addButton.click();
  await addButton.click();

  const creators = page.getByTestId("session-create-panel");
  await expect(creators).toHaveCount(2);

  const firstCreator = creators.first();
  await firstCreator.getByTestId("session-create-cli").selectOption(cliId);
  const workdir = "/tmp/dockview-plus";
  await firstCreator.getByTestId("session-create-workdir").fill(workdir);
  await firstCreator.getByTestId("session-create-model").fill("gpt-5.1-codex");
  await firstCreator.getByTestId("session-create-submit").click();

  const sessions = await waitForSessionCount(request, 1);
  const sessionId = sessions[sessions.length - 1]?.id as string;

  await expect(
    page.getByTestId(`session-input-${sessionId}`),
  ).toBeVisible({ timeout: 15_000 });

  const remainingCreator = page.getByTestId("session-create-panel");
  await expect(remainingCreator).toHaveCount(1);
  await expect(remainingCreator.first().getByTestId("session-create-submit")).toBeVisible();

  await expect(page.locator('[data-testid^="session-send-"]')).toHaveCount(1);

  const tabLocator = page
    .locator('[data-testid="session-workspace"] .dv-default-tab')
    .filter({ hasText: sessionId.slice(0, 6) });
  await expect(tabLocator.first()).toBeVisible({ timeout: 10_000 });
  await expect(
    page.locator('[data-testid="session-workspace"] .dv-default-tab').filter({ hasText: "New Session" }),
  ).toHaveCount(1);
});
