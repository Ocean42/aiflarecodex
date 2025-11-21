import { test, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildFrontendEntryUrl,
  waitForBackendCli,
  waitForSessionCount,
  clickSessionEntry,
  sendMessageAndExpectAssistant,
  resetBackendState,
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
  expect(reply.toLowerCase()).toMatch(/bild|foto|image/);
  expect(reply.toLowerCase()).toMatch(/katze|cat|feline/);
});
