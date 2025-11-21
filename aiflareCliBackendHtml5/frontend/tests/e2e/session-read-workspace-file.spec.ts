import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  buildFrontendEntryUrl,
  waitForBackendCli,
  waitForSessionCount,
  clickSessionEntry,
  sendMessageAndExpectAssistant,
  resetBackendState,
} from "./utils.js";

const FRONTEND_ENTRY_URL = buildFrontendEntryUrl();
const WORKSPACE_DIR =
  "/Volumes/devdisk/dev/ai-guard/aiflarecodex/aiflareCliBackendHtml5/examples";
const TARGET_FILE = "bigText.txt";
const EXPECTED_SEGMENTS = readFileSync(
  path.join(WORKSPACE_DIR, TARGET_FILE),
  "utf-8",
)
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line.length > 0);

function normalizeContent(value: string): string {
  return value
    .replace(/[“”„]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

test("session can read the entire bigText file from workspace", async ({ page, request }) => {
  await resetBackendState(request);
  await waitForBackendCli(request);
  await page.goto(FRONTEND_ENTRY_URL);

  await page.getByLabel("Workdir:").fill(WORKSPACE_DIR);
  await page.getByRole("button", { name: "Create Session" }).click();
  const sessions = await waitForSessionCount(request, 1);
  const sessionId = sessions[sessions.length - 1]?.id;
  expect(sessionId).toBeTruthy();
  await clickSessionEntry(page, sessionId!);

  const response = await sendMessageAndExpectAssistant(
    page,
    sessionId!,
    `gib mir den ganzen inhalt von ${TARGET_FILE} wieder`,
    /.+/,
    { timeout: 60_000, captureText: true },
  );
  expect(response).toBeDefined();
  const normalized = normalizeContent(response!.text);
  for (const segment of EXPECTED_SEGMENTS) {
    expect(normalized).toContain(normalizeContent(segment));
  }
});
