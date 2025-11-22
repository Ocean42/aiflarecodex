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

test("timeline sorts events by timestamp then id", async ({ page, request }) => {
  await resetBackendState(request);
  await waitForBackendCli(request);
  await page.goto(FRONTEND_ENTRY_URL);
  await ensureCliVisible(page, 1);

  const sessionId = await createSessionViaUi(page, request);
  const base = Date.now();
  await appendTimelineEvents(request, sessionId, [
    {
      id: "evt_third",
      type: "message",
      role: "system",
      content: [{ type: "text", text: "third event" }],
      createdAt: new Date(base + 3000).toISOString(),
    },
    {
      id: "evt_first",
      type: "message",
      role: "system",
      content: [{ type: "text", text: "first event" }],
      createdAt: new Date(base + 1000).toISOString(),
    },
    {
      id: "evt_second",
      type: "message",
      role: "system",
      content: [{ type: "text", text: "second event" }],
      createdAt: new Date(base + 2000).toISOString(),
    },
    {
      id: "evt_tie_z",
      type: "message",
      role: "system",
      content: [{ type: "text", text: "tie z event" }],
      createdAt: new Date(base + 4000).toISOString(),
    },
    {
      id: "evt_tie_a",
      type: "message",
      role: "system",
      content: [{ type: "text", text: "tie a event" }],
      createdAt: new Date(base + 4000).toISOString(),
    },
  ]);

  await clickSessionEntry(page, sessionId);
  const timelineMessages = page.locator(
    `[data-testid='session-timeline-${sessionId}'] [data-event-type='message']`,
  );

  await expect(timelineMessages).toHaveCount(5);
  const orderedTexts = (await timelineMessages.allTextContents()).map((text) =>
    text.replace(/\s+/g, " ").trim(),
  );
  expect(orderedTexts).toEqual([
    "System: first event",
    "System: second event",
    "System: third event",
    "System: tie a event",
    "System: tie z event",
  ]);
});
