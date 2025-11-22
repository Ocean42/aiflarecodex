import { test, expect } from "./baseTest.js";
import {
  buildFrontendEntryUrl,
  resetBackendState,
  waitForBackendCli,
  ensureCliVisible,
  waitForSessionCount,
} from "./utils.js";

const FRONTEND_ENTRY_URL = buildFrontendEntryUrl();

test("dockview fills the page, + opens creator, session replaces form", async ({
  page,
  request,
}) => {
  await resetBackendState(request);
  await waitForBackendCli(request);
  await page.goto(FRONTEND_ENTRY_URL);

  const workspace = page.getByTestId("session-workspace");
  await expect(workspace).toBeVisible({ timeout: 10_000 });
  const box = await workspace.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThan(500);
  expect(box?.width ?? 0).toBeGreaterThan(800);
  await expect(page.getByText("Click + to create a new session.")).toBeVisible();
  await expect(page.getByTestId("session-create-panel")).toHaveCount(0);

  const addButton = page.getByTestId("dockview-add-panel");
  await expect(addButton).toBeVisible({ timeout: 10_000 });
  await addButton.click();

  const creator = page.getByTestId("session-create-panel").last();
  await expect(creator).toBeVisible({ timeout: 5_000 });
  const clis = await waitForBackendCli(request);
  await ensureCliVisible(page, 1);
  await creator.getByTestId("session-create-cli").selectOption({ value: clis[0]! });
  await creator.getByTestId("session-create-workdir").fill("/tmp/e2e-dockview");
  await creator.getByTestId("session-create-model").fill("gpt-5.1-codex");

  await creator.getByRole("button", { name: "Create Session" }).click({ force: true });
  const sessions = await waitForSessionCount(request, 1);
  const sessionId = sessions[sessions.length - 1]?.id as string;

  const tab = page
    .locator('[data-testid="session-workspace"] .dv-default-tab')
    .filter({ hasText: sessionId.slice(0, 6) });
  await expect(tab.first()).toBeVisible({ timeout: 15_000 });

  await expect(
    page.locator(`[data-testid="session-input-${sessionId}"]`).first(),
  ).toBeVisible({
    timeout: 15_000,
  });

  const sendButtons = page.locator('[data-testid^="session-send-"]');
  await expect(sendButtons).toHaveCount(1);
});
