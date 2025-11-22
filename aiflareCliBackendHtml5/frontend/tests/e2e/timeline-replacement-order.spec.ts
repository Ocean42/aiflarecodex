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

test("timeline replaces streaming entries with final content", async ({ page, request }) => {
  await resetBackendState(request);
  await waitForBackendCli(request);
  await page.goto(FRONTEND_ENTRY_URL);
  await ensureCliVisible(page, 1);

  const sessionId = await createSessionViaUi(page, request);
  const baseTime = new Date().toISOString();
  await appendTimelineEvents(request, sessionId, [
    {
      id: "evt_stream",
      type: "message",
      role: "assistant",
      content: [{ type: "text", text: "Partial response..." }],
      state: "streaming",
      createdAt: baseTime,
    },
  ]);
  await appendTimelineEvents(request, sessionId, [
    {
      id: "evt_stream",
      type: "message",
      role: "assistant",
      content: [{ type: "text", text: "Final response ready." }],
      state: "completed",
    },
  ]);

  await clickSessionEntry(page, sessionId);
  const assistantMessages = page.locator(
    `[data-testid='session-timeline-${sessionId}'] [data-event-type='message'][data-role='assistant']`,
  );
  await expect(assistantMessages).toHaveCount(1);
  await expect(assistantMessages.first()).toContainText("Final response ready.");
  await expect(assistantMessages.first()).not.toContainText("Partial response...");
});
