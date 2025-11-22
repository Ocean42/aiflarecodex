import { test, expect } from "./baseTest.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildFrontendEntryUrl,
  waitForBackendCli,
  waitForSessionCount,
  clickSessionEntry,
  sendMessageAndExpectAssistant,
  resetBackendState,
  ensureCliVisible,
} from "./utils.js";

const FRONTEND_ENTRY_URL = buildFrontendEntryUrl();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../..");
const katzeWorkdir = path.join(repoRoot, "examples");

test("view_image tool identifies katze picture", async ({ page, request }) => {
  await resetBackendState(request);
  await waitForBackendCli(request);
  await page.goto(FRONTEND_ENTRY_URL);
  await ensureCliVisible(page, 1);

  await page.getByLabel("Workdir:").fill(katzeWorkdir);
  await page.getByRole("button", { name: "Create Session" }).click();
  const sessions = await waitForSessionCount(request, 1);
  const sessionId = sessions[sessions.length - 1]?.id;
  expect(sessionId).toBeTruthy();
  await clickSessionEntry(page, sessionId!);

  const result = await sendMessageAndExpectAssistant(
    page,
    sessionId!,
    "Such mal ob du hier ein Bild namens katze findest und sag mir was darin zu sehen ist.",
    /katze|cat|feline/i,
    { timeout: 90_000, captureText: true },
  );

  const reply = result?.text ?? "";
  expect(reply.toLowerCase()).not.toMatch(/keine datei|not find|nicht gefunden/);
  expect(reply.toLowerCase()).toMatch(/katze|cat|feline/);

  const timelineSelector = `[data-testid='session-timeline-${sessionId}']`;
  const toolStarts = page.locator(
    `${timelineSelector} [data-event-type='tool-start']`,
  );
  const toolResults = page.locator(
    `${timelineSelector} [data-event-type='tool-result']`,
  );

  await expect(toolStarts.filter({ hasText: "list_dir" })).toHaveCount(1, {
    timeout: 15_000,
  });
  await expect(toolResults.filter({ hasText: "list_dir" })).toHaveCount(1, {
    timeout: 15_000,
  });
  await expect(toolStarts.filter({ hasText: "view_image" })).toHaveCount(1, {
    timeout: 15_000,
  });
  await expect(toolResults.filter({ hasText: "view_image" })).toHaveCount(1, {
    timeout: 15_000,
  });
});
