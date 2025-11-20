import { test, expect, type Page } from "@playwright/test";
import {
  buildFrontendEntryUrl,
  waitForBackendCli,
  waitForSessionCount,
} from "./utils.js";

const FRONTEND_ENTRY_URL = buildFrontendEntryUrl();

test("sessions keep independent context", async ({ page, request }) => {
  await waitForBackendCli(request);
  await page.goto(FRONTEND_ENTRY_URL);

  // Session 1 setup
  await page.getByRole("button", { name: "Create Session" }).click();
  const sessionsAfterFirst = await waitForSessionCount(request, 1);
  const session1Id = sessionsAfterFirst[sessionsAfterFirst.length - 1]?.id;
  expect(session1Id).toBeTruthy();
  await page.getByTestId(`session-select-${session1Id!}`).click();
  await sendMessageAndExpectAssistant(
    page,
    "hallo, antworte mir bitte wenn ich frage welche session mit session1 und jetzt erstmal mit Okay.",
    "Okay",
  );

  // Session 2 setup
  await page.getByRole("button", { name: "Create Session" }).click();
  const sessionsAfterSecond = await waitForSessionCount(request, 2);
  const session2Id = sessionsAfterSecond[sessionsAfterSecond.length - 1]?.id;
  expect(session2Id).toBeTruthy();
  await page.getByTestId(`session-select-${session2Id!}`).click();
  await sendMessageAndExpectAssistant(
    page,
    "hallo, antworte mir bitte wenn ich frage welche session mit session2 und jetzt erstmal mit Okay.",
    "Okay",
  );

  // Session-specific questions
  await page.getByTestId(`session-select-${session1Id!}`).click();
  await sendMessageAndExpectAssistant(page, "Welche Session?", "session1");

  await page.getByTestId(`session-select-${session2Id!}`).click();
  await sendMessageAndExpectAssistant(page, "Welche Session?", "session2");
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
