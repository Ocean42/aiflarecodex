import { test, expect } from "./baseTest.js";
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

test("shell tool output appears in chat", async ({ page, request }) => {
  await resetBackendState(request);
  await waitForBackendCli(request);
  await page.goto(FRONTEND_ENTRY_URL);
  await ensureCliVisible(page, 1);

  await page.getByRole("button", { name: "Create Session" }).click();
  const sessions = await waitForSessionCount(request, 1);
  const sessionId = sessions[sessions.length - 1]?.id;
  expect(sessionId).toBeTruthy();
  await clickSessionEntry(page, sessionId!);

  await sendMessageAndExpectAssistant(
    page,
    sessionId!,
    "Bitte benutze das shell tool, um den Befehl `printf TOOL_OK` auszuführen, und gib ausschließlich die Ausgabe des Befehls zurück.",
    /TOOL_OK/,
    { timeout: 60_000 },
  );
});
