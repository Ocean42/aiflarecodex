import { test, expect } from "./baseTest.js";
import {
  buildFrontendEntryUrl,
  resetBackendState,
  waitForBackendCli,
  ensureCliVisible,
  createSessionViaUi,
  appendTimelineEvents,
  getTimelineScrollMetrics,
  scrollTimelineTo,
} from "./utils.js";

const FRONTEND_ENTRY_URL = buildFrontendEntryUrl();

test("timeline does not reset scroll when new messages arrive", async ({ page, request }) => {
  await resetBackendState(request);
  await waitForBackendCli(request);
  await page.goto(FRONTEND_ENTRY_URL);
  await ensureCliVisible(page, 1);

  const sessionId = await createSessionViaUi(page, request, {
    workdir: "/tmp/scroll-stability",
  });

  // Seed enough events to require scrolling.
  const baseTime = Date.now();
  const initialEvents = Array.from({ length: 20 }).map((_, idx) => ({
    id: `evt_seed_${idx}`,
    type: "message",
    role: idx % 2 === 0 ? "assistant" : "user",
    content: [{ type: "text", text: `Zeile ${idx} - ${"x".repeat(80)}` }],
    createdAt: new Date(baseTime + idx).toISOString(),
  }));
  await appendTimelineEvents(request, sessionId, initialEvents);
  await expect(page.locator(`[data-testid='session-timeline-${sessionId}'] li`)).toHaveCount(
    initialEvents.length,
  );

  await scrollTimelineTo(page, sessionId, "middle");
  const before = await getTimelineScrollMetrics(page, sessionId);

  // Append more events to simulate streaming updates.
  const followupEvents = Array.from({ length: 3 }).map((_, idx) => ({
    id: `evt_follow_${idx}`,
    type: "message",
    role: "assistant",
    content: [{ type: "text", text: `Fortsetzung ${idx} ${"y".repeat(120)}` }],
    createdAt: new Date(baseTime + 100 + idx).toISOString(),
  }));
  await appendTimelineEvents(request, sessionId, followupEvents);
  await expect(page.locator(`[data-testid='session-timeline-${sessionId}'] li`)).toHaveCount(
    initialEvents.length + followupEvents.length,
    { timeout: 10_000 },
  );

  const after = await getTimelineScrollMetrics(page, sessionId);
  expect(Math.abs(after.scrollTop - before.scrollTop)).toBeLessThan(10);
});
