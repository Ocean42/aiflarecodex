import { test, expect } from "./baseTest.js";
import {
  buildFrontendEntryUrl,
  resetBackendState,
  waitForBackendCli,
  ensureCliVisible,
  clickSessionEntry,
  appendTimelineEvents,
  createSessionViaUi,
} from "./utils.js";

const FRONTEND_ENTRY_URL = buildFrontendEntryUrl();

test("timeline renders plan update events", async ({ page, request }) => {
  await resetBackendState(request);
  await waitForBackendCli(request);
  await page.goto(FRONTEND_ENTRY_URL);
  await ensureCliVisible(page, 1);

  const sessionId = await createSessionViaUi(page, request);
  const baseTime = Date.now();
  await appendTimelineEvents(request, sessionId, [
    {
      id: "evt_plan_1",
      type: "plan_update",
      createdAt: new Date(baseTime).toISOString(),
      explanation: "Initial plan drafted",
      plan: [
        { step: "Collect files", status: "in_progress" },
        { step: "Summarize findings", status: "pending" },
      ],
    },
    {
      id: "evt_plan_2",
      type: "plan_update",
      createdAt: new Date(baseTime + 1).toISOString(),
      plan: [
        { step: "Collect files", status: "completed" },
        { step: "Summarize findings", status: "in_progress" },
      ],
    },
  ]);

  await clickSessionEntry(page, sessionId);

  const planEvents = page.locator(
    `[data-testid='session-timeline-${sessionId}'] [data-event-type='plan']`,
  );
  await expect(planEvents).toHaveCount(2, { timeout: 20_000 });
  await expect(planEvents.nth(0)).toContainText("Plan Update:");
  await expect(planEvents.nth(0)).toContainText("Initial plan drafted");
  await expect(planEvents.nth(1)).toContainText("completed Collect files");
  await expect(planEvents.nth(1)).toContainText("in_progress Summarize findings");
});
