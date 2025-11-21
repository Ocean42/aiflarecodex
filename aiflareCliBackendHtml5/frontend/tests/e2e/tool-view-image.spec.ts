import { test, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildFrontendEntryUrl,
  waitForBackendCli,
  waitForSessionCount,
  clickSessionEntry,
  sendMessageAndExpectAssistant,
} from "./utils.js";

const FRONTEND_ENTRY_URL = buildFrontendEntryUrl();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../..");
const katzeWorkdir = path.join(repoRoot, "aiflare");

test("view_image tool identifies katze picture", async ({ page, request }) => {
  await waitForBackendCli(request);
  await page.goto(FRONTEND_ENTRY_URL);

  await page.getByLabel("Workdir:").fill(katzeWorkdir);
  await page.getByRole("button", { name: "Create Session" }).click();
  const sessions = await waitForSessionCount(request, 1);
  const sessionId = sessions[sessions.length - 1]?.id;
  expect(sessionId).toBeTruthy();
  await clickSessionEntry(page, sessionId!);

  await sendMessageAndExpectAssistant(
    page,
    "Such mal ob du hier ein Bild namens katze findest und sag mir was darin zu sehen ist.",
    /katze|cat|feline/i,
    { timeout: 90_000 },
  );
});
