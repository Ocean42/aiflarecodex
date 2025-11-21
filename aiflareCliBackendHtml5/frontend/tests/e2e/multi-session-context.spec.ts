import { test, expect, type Page } from "@playwright/test";
import {
  buildFrontendEntryUrl,
  waitForBackendCli,
  waitForSessionCount,
  clickSessionEntry,
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
  await clickSessionEntry(page, session1Id!);
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
  await clickSessionEntry(page, session2Id!);
  await sendMessageAndExpectAssistant(
    page,
    "hallo, antworte mir bitte wenn ich frage welche session mit session2 und jetzt erstmal mit Okay.",
    "Okay",
  );

  // Session context stays separated
  await clickSessionEntry(page, session1Id!);
  await expectLatestAssistantMessage(page, "Okay");
  await expectNoSessionPlaceholder(page);

  await clickSessionEntry(page, session2Id!);
  await expectLatestAssistantMessage(page, "Okay");
  await expectNoSessionPlaceholder(page);
});

async function sendMessageAndExpectAssistant(
  page: Page,
  message: string,
  expected: string,
): Promise<void> {
  const assistantMessages = getAssistantMessages(page);
  const initialCount = await assistantMessages.count();
  await page.getByTestId("session-input").fill(message);
  await page.getByTestId("session-send").click();
  await expect(assistantMessages).toHaveCount(initialCount + 1, { timeout: 15_000 });
  await expect(assistantMessages.nth(initialCount)).toContainText(
    new RegExp(expected, "i"),
    {
      timeout: 15_000,
    },
  );
}

async function expectLatestAssistantMessage(page: Page, expected: string) {
  const assistantMessages = getAssistantMessages(page);
  await expect(assistantMessages.first()).toBeVisible({ timeout: 10_000 });
  await expect(assistantMessages.last()).toContainText(
    new RegExp(expected, "i"),
    {
      timeout: 10_000,
    },
  );
}

async function expectNoSessionPlaceholder(page: Page): Promise<void> {
  await expect(
    page.locator("text=Select a session to start chatting."),
  ).toHaveCount(0, { timeout: 5_000 });
}

function getAssistantMessages(page: Page) {
  return page
    .locator("[data-testid='session-messages'] li")
    .filter({
      has: page.locator("strong", { hasText: /^AI:/ }),
    });
}
