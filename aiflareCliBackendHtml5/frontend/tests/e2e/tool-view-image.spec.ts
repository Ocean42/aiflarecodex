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
    "Nutze genau einen Aufruf von view_image auf ./katze.jpg (Workdir gesetzt), keine anderen Tools. Beschreibe kurz, was darauf zu sehen ist.",
    /katze|kätz|kater|kätzchen|katzenkopf|katzenbild|katzenfoto|katzenmotiv|katzenfigur|katzenzeichnung|katzenillustration|katzenwesen|samtene[rs]? pfote|samtpfote|haustierkatze|stubentiger|mieze|miez|katzi|cat|kitten|kitty|feline/i,
    { timeout: 90_000, captureText: true },
  );

  const reply = result?.text ?? "";
  expect(reply.toLowerCase()).not.toMatch(/keine datei|not find|nicht gefunden/);
  expect(reply.toLowerCase()).toMatch(
    /katze|kätz|kater|kätzchen|katzenkopf|katzenbild|katzenfoto|katzenmotiv|katzenfigur|katzenzeichnung|katzenillustration|katzenwesen|samtene[rs]? pfote|samtpfote|haustierkatze|stubentiger|mieze|miez|katzi|cat|kitten|kitty|feline/,
  );

  const timelineSelector = `[data-testid='session-timeline-${sessionId}']`;
  const toolStarts = page.locator(
    `${timelineSelector} [data-event-type='tool-start']`,
  );
  const toolResults = page.locator(
    `${timelineSelector} [data-event-type='tool-result']`,
  );

  const runStatus = page.getByTestId("session-run-status");
  await expect(runStatus).toBeHidden({ timeout: 30_000 });

  await expect(toolStarts.filter({ hasText: "list_dir" })).toHaveCount(0);
  await expect(toolResults.filter({ hasText: "list_dir" })).toHaveCount(0);
  const viewStarts = toolStarts.filter({ hasText: "view_image" });
  const viewResults = toolResults.filter({ hasText: "view_image" });
  await expect(viewStarts).toHaveCount(1, { timeout: 20_000 });
  await expect(viewResults).toHaveCount(1, { timeout: 20_000 });
});
