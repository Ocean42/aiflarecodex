import { test, expect } from "./baseTest.js";
import {
  buildFrontendEntryUrl,
  resetBackendState,
  waitForBackendCli,
  ensureCliVisible,
  createSessionViaUi,
  getSessionTab,
  expectTabActive,
  expectTabInactive,
} from "./utils.js";

const FRONTEND_ENTRY_URL = buildFrontendEntryUrl();

test("background tab stays inactive; spinner and unread indicator show correctly", async ({
  page,
  request,
}) => {
  await resetBackendState(request);
  await waitForBackendCli(request);
  await page.goto(FRONTEND_ENTRY_URL);
  await ensureCliVisible(page, 1);

  // First session in default group
  const sessionLeft = await createSessionViaUi(page, request, {
    workdir: "/tmp/tab-left",
  });
  await expectTabActive(page, sessionLeft);

  // Add another creator to the same group and create a second session
  const groupAdd = page.getByTestId("session-workspace").locator("[data-testid^='group-add-']").first();
  await groupAdd.click();
  const sessionRight = await createSessionViaUi(page, request, {
    workdir: "/tmp/tab-right",
  });

  // Send a long prompt on the right tab, then immediately switch to the left
  await getSessionTab(page, sessionRight).click();
  await expectTabActive(page, sessionRight);
  const sessionInput = page.getByTestId(`session-input-${sessionRight}`);
  await sessionInput.click();
  await sessionInput.type(
    "Schreibe 10 nummerierte Sätze über Kaffeebohnen, jeweils mindestens 15 Wörter.",
  );
  await expect(sessionInput).toHaveValue(/Kaffeebohnen/, { timeout: 10_000 });
  const sendButton = page.getByTestId(`session-send-${sessionRight}`);
  await expect(sendButton).toHaveAttribute("data-running", "false", { timeout: 20_000 });
  await expect(sendButton).toBeEnabled({ timeout: 20_000 });
  await page.getByTestId(`session-send-${sessionRight}`).click();
  await expect.poll(async () => await getSessionTab(page, sessionRight).innerText(), {
    timeout: 20_000,
  }).toMatch(/⏳/);

  await getSessionTab(page, sessionLeft).click();
  await expectTabActive(page, sessionLeft);
  await expectTabInactive(page, sessionRight);

  // Background session should finish without stealing focus and show unread indicator
  await expect
    .poll(async () => await getSessionTab(page, sessionRight).innerText(), { timeout: 90_000 })
    .toMatch(/•/);
  await expectTabInactive(page, sessionRight);

  // When user visits the tab, unread marker clears
  await getSessionTab(page, sessionRight).click();
  await expectTabActive(page, sessionRight);
  await expect(getSessionTab(page, sessionRight)).not.toContainText("•");
});
