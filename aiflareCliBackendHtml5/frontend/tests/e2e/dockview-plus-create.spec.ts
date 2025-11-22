import { test, expect } from "./baseTest.js";
import {
  buildFrontendEntryUrl,
  resetBackendState,
  waitForBackendCli,
  waitForSessionCount,
} from "./utils.js";

const FRONTEND_ENTRY_URL = buildFrontendEntryUrl();

test("dockview + creates a session inside the panel", async ({ page, request }) => {
  await resetBackendState(request);
  const clis = await waitForBackendCli(request);
  const cliId = clis[0]!;

  await page.goto(FRONTEND_ENTRY_URL);

  await page.getByTestId("dockview-add-panel").click();
  const creator = page.getByTestId("session-create-panel").last();
  await expect(creator).toBeVisible({ timeout: 10_000 });

  await creator.getByTestId("session-create-cli").selectOption(cliId);
  const workdir = "/tmp/dockview-plus";
  await creator.getByTestId("session-create-workdir").fill(workdir);
  await creator.getByTestId("session-create-model").fill("gpt-5.1-codex");
  await creator.getByTestId("session-create-submit").click();

  const sessions = await waitForSessionCount(request, 1);
  const sessionId = sessions[sessions.length - 1]?.id as string;

  await expect(
    page.getByTestId(`session-input-${sessionId}`),
  ).toBeVisible({ timeout: 15_000 });

  await expect(creator).toHaveCount(0);

  const tabLocator = page
    .locator('[data-testid="session-workspace"] .dv-default-tab')
    .filter({ hasText: sessionId.slice(0, 6) });
  await expect(tabLocator.first()).toBeVisible({ timeout: 10_000 });
});
