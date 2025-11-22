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

test("timeline shows tool call lifecycle entries", async ({ page, request }) => {
  await resetBackendState(request);
  await waitForBackendCli(request);
  await page.goto(FRONTEND_ENTRY_URL);
  await ensureCliVisible(page, 1);

  const sessionId = await createSessionViaUi(page, request);
  const baseTime = Date.now();
  await appendTimelineEvents(request, sessionId, [
    {
      id: "evt_tool_start",
      type: "tool_call_started",
      callId: "call_demo",
      toolName: "shell",
      createdAt: new Date(baseTime).toISOString(),
    },
    {
      id: "evt_tool_result",
      type: "tool_call_output",
      callId: "call_demo",
      toolName: "shell",
      status: "ok",
      durationSeconds: 1.2,
      outputCount: 2,
      createdAt: new Date(baseTime + 1).toISOString(),
    },
  ]);

  await clickSessionEntry(page, sessionId);

  const toolStart = page.locator(
    `[data-testid='session-timeline-${sessionId}'] [data-event-type='tool-start']`,
  );
  const toolResult = page.locator(
    `[data-testid='session-timeline-${sessionId}'] [data-event-type='tool-result']`,
  );

  await expect(toolStart).toHaveCount(1);
  await expect(toolStart.first()).toContainText("Tool started:");
  await expect(toolStart.first()).toContainText("shell (call_demo)");
  await expect(toolResult).toHaveCount(1);
  await expect(toolResult.first()).toContainText("Tool completed:");
  await expect(toolResult.first()).toContainText("shell");
});
