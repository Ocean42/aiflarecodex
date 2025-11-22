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

test("timeline displays exec lifecycle and stream output", async ({ page, request }) => {
  await resetBackendState(request);
  await waitForBackendCli(request);
  await page.goto(FRONTEND_ENTRY_URL);
  await ensureCliVisible(page, 1);

  const sessionId = await createSessionViaUi(page, request);
  const baseTime = Date.now();
  await appendTimelineEvents(request, sessionId, [
    {
      id: "evt_exec_begin",
      type: "exec_event",
      phase: "begin",
      callId: "call_exec",
      command: ["bash", "-lc", "printf HI && printf ERR 1>&2"],
      cwd: "/workspace",
      createdAt: new Date(baseTime).toISOString(),
    },
    {
      id: "evt_exec_stdout",
      type: "exec_output",
      callId: "call_exec",
      stream: "stdout",
      text: "HI",
      createdAt: new Date(baseTime + 1).toISOString(),
    },
    {
      id: "evt_exec_stderr",
      type: "exec_output",
      callId: "call_exec",
      stream: "stderr",
      text: "ERR",
      createdAt: new Date(baseTime + 2).toISOString(),
    },
    {
      id: "evt_exec_end",
      type: "exec_event",
      phase: "end",
      callId: "call_exec",
      command: ["bash", "-lc", "printf HI && printf ERR 1>&2"],
      exitCode: 0,
      durationSeconds: 0.2,
      createdAt: new Date(baseTime + 3).toISOString(),
    },
  ]);

  await clickSessionEntry(page, sessionId);

  const execEvents = page.locator(
    `[data-testid='session-timeline-${sessionId}'] [data-event-type='exec']`,
  );
  const outputEvents = page.locator(
    `[data-testid='session-timeline-${sessionId}'] [data-event-type='exec-output']`,
  );

  await expect(execEvents.first()).toContainText("Exec started:");
  await expect(execEvents.first()).toContainText("printf HI");
  await expect(execEvents.nth(1)).toContainText("Exec ended:");
  await expect(execEvents.nth(1)).toContainText("printf HI");
  await expect(outputEvents.first()).toContainText("stdout:");
  await expect(outputEvents.first()).toContainText("HI");
  await expect(outputEvents.nth(1)).toContainText("stderr:");
  await expect(outputEvents.nth(1)).toContainText("ERR");
});
