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

test("timeline renders reasoning deltas", async ({ page, request }) => {
  await resetBackendState(request);
  await waitForBackendCli(request);
  await page.goto(FRONTEND_ENTRY_URL);
  await ensureCliVisible(page, 1);

  const sessionId = await createSessionViaUi(page, request);
  const baseTime = Date.now();
  await appendTimelineEvents(request, sessionId, [
    {
      id: "evt_reason_summary",
      type: "reasoning_summary_delta",
      summaryIndex: 0,
      delta: "Drafting outline",
      createdAt: new Date(baseTime).toISOString(),
    },
    {
      id: "evt_reason_content",
      type: "reasoning_content_delta",
      contentIndex: 0,
      delta: "Consider workspace structure",
      createdAt: new Date(baseTime + 1).toISOString(),
    },
    {
      id: "evt_reason_break",
      type: "reasoning_section_break",
      summaryIndex: 0,
      createdAt: new Date(baseTime + 2).toISOString(),
    },
  ]);

  await clickSessionEntry(page, sessionId);

  const reasoningEvents = page.locator(
    `[data-testid='session-timeline-${sessionId}'] [data-event-type='reasoning']`,
  );
  await expect(reasoningEvents.first()).toContainText("Thinking:");
  await expect(reasoningEvents.first()).toContainText("Drafting outline");
  await expect(reasoningEvents.nth(1)).toContainText("Consider workspace structure");
  const breaks = page
    .locator(`[data-testid='session-timeline-${sessionId}']`)
    .locator("hr");
  await expect(breaks).toHaveCount(1);
});
