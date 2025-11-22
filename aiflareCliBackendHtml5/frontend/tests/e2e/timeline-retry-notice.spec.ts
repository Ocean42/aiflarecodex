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

test("timeline shows stream retry notice messages", async ({ page, request }) => {
  await resetBackendState(request);
  await waitForBackendCli(request);
  await page.goto(FRONTEND_ENTRY_URL);
  await ensureCliVisible(page, 1);

  const sessionId = await createSessionViaUi(page, request);
  await appendTimelineEvents(request, sessionId, [
    {
      id: "evt_retry_notice",
      type: "message",
      role: "system",
      content: [
        {
          type: "text",
          text: "Reconnecting... 1/3",
        },
      ],
    },
  ]);

  await clickSessionEntry(page, sessionId);
  const systemMessages = page.locator(
    `[data-testid='session-timeline-${sessionId}'] [data-event-type='message'][data-role='system']`,
  );
  await expect(systemMessages).toHaveCount(1);
  await expect(systemMessages.first()).toContainText("Reconnecting... 1/3");
});
