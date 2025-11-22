import { test, expect } from "./baseTest.js";
import {
  buildFrontendEntryUrl,
  resetBackendState,
  waitForBackendCli,
  ensureCliVisible,
  waitForSessionCount,
  clickSessionEntry,
  appendTimelineEvents,
} from "./utils.js";

const FRONTEND_ENTRY_URL = buildFrontendEntryUrl();

test("context indicator reflects timeline growth", async ({ page, request }) => {
  await resetBackendState(request);
  await waitForBackendCli(request);
  await page.goto(FRONTEND_ENTRY_URL);
  await ensureCliVisible(page, 1);

  await page.getByRole("button", { name: "Create Session" }).click();
  const sessions = await waitForSessionCount(request, 1);
  const sessionId = sessions[sessions.length - 1]?.id;
  if (!sessionId) {
    throw new Error("session creation failed");
  }
  await clickSessionEntry(page, sessionId);

  const contextIndicator = page.getByTestId("context-indicator");
  await expect(contextIndicator).toBeVisible({ timeout: 10_000 });

  const readPercent = async (): Promise<number> => {
    const text = (await contextIndicator.innerText()) ?? "";
    const match = text.match(/(\d+)%/);
    if (!match) {
      throw new Error(`Unable to parse context percentage from "${text}"`);
    }
    return Number(match[1]);
  };

  const initialPercent = await readPercent();
  expect(initialPercent).toBeGreaterThan(50);

  const appendLargeMessage = async (suffix: string) => {
    await appendTimelineEvents(request, sessionId, [
      {
        id: `evt_large_${suffix}`,
        type: "message",
        role: "user",
        content: [
          {
            type: "text",
            text: "L".repeat(20_000),
          },
        ],
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  await appendLargeMessage("first");
  await expect.poll(async () => await readPercent(), {
    timeout: 30_000,
  }).toBeLessThan(initialPercent);

  const afterFirst = await readPercent();

  await appendLargeMessage("second");
  await expect.poll(async () => await readPercent(), {
    timeout: 30_000,
  }).toBeLessThan(afterFirst);
});
