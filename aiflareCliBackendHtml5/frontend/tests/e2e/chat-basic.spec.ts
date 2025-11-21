import { test, expect, type Page } from "@playwright/test";
import {
  buildFrontendEntryUrl,
  waitForBackendCli,
  waitForSessionCount,
  clickSessionEntry,
} from "./utils.js";

const FRONTEND_ENTRY_URL = buildFrontendEntryUrl();

test("single session responds with Hallo", async ({ page, request }) => {
  await waitForBackendCli(request);
  await page.goto(FRONTEND_ENTRY_URL);

  await page.getByRole("button", { name: "Create Session" }).click();
  await waitForSessionCount(request, 1);
  const latestSessions = await waitForSessionCount(request, 1);
  const sessionId = latestSessions[latestSessions.length - 1]?.id as string;
  await clickSessionEntry(page, sessionId);

  await sendMessageAndExpectAssistant(page, "hi ai antworte mir bitte mit hallo", "Hallo");
});

async function sendMessageAndExpectAssistant(
  page: Page,
  message: string,
  expected: string,
): Promise<void> {
  const assistantMessages = page.locator(
    "[data-testid='session-messages'] li[data-role='assistant']",
  );
  const initialCount = await assistantMessages.count();
  await page.getByTestId("session-input").fill(message);
  await page.getByTestId("session-send").click();
  await expect(assistantMessages).toHaveCount(initialCount + 1, { timeout: 15_000 });
  await expect(assistantMessages.nth(initialCount)).toContainText(expected, { timeout: 15_000 });
}
