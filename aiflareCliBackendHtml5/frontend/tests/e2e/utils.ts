import { expect, type APIRequestContext, type Locator, type Page, type TestInfo } from "@playwright/test";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const BACKEND_PORT = process.env["E2E_BACKEND_PORT"] ?? "4123";
const FRONTEND_PORT = process.env["E2E_FRONTEND_PORT"] ?? "5174";
export const BACKEND_URL =
  process.env["E2E_BACKEND_URL"] ?? `http://127.0.0.1:${BACKEND_PORT}`;
export const FRONTEND_URL =
  process.env["E2E_FRONTEND_URL"] ?? `http://127.0.0.1:${FRONTEND_PORT}`;

export async function resetBackendState(request: APIRequestContext): Promise<void> {
  await request.post(`${BACKEND_URL}/api/debug/reset`);
}

export function buildFrontendEntryUrl(): string {
  const normalizedFrontend = FRONTEND_URL.endsWith("/")
    ? FRONTEND_URL.slice(0, -1)
    : FRONTEND_URL;
  return `${normalizedFrontend}/?backendUrl=${encodeURIComponent(BACKEND_URL)}`;
}

export async function waitForBackendCli(request: APIRequestContext): Promise<Array<string>> {
  const timeoutMs = 15_000;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await request.get(`${BACKEND_URL}/api/clis`);
    const data = await res.json();
    const ids: Array<string> = data?.clis?.map((cli: { id: string }) => cli.id) ?? [];
    if (ids.length > 0) {
      return ids;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("No CLI registered in backend within timeout");
}

export async function waitForSessionCount(
  request: APIRequestContext,
  expectedCount: number,
): Promise<Array<{ id: string }>> {
  const timeoutMs = 15_000;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await request.get(`${BACKEND_URL}/api/sessions`);
    const data = await res.json();
    if (Array.isArray(data?.sessions) && data.sessions.length >= expectedCount) {
      return data.sessions;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Expected ${expectedCount} sessions, but not ready in time`);
}

export async function pollForNoActions(request: APIRequestContext): Promise<void> {
  const timeoutMs = 15_000;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await request.get(`${BACKEND_URL}/api/actions`);
    const data = await res.json();
    if (!data?.actions?.length) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Actions still pending after timeout");
}

export async function clickSessionEntry(
  page: Page,
  sessionId: string,
): Promise<void> {
  const input = page.getByTestId(`session-input-${sessionId}`);
  const tab = page
    .locator('[data-testid="session-workspace"] .dv-default-tab')
    .filter({ hasText: sessionId.slice(0, 6) });
  if ((await tab.count()) === 0) {
    const minimizedToggle = page.getByTestId("topbar-minimized-toggle");
    const minimizedDialog = page.getByTestId("topbar-minimized-modal");
    const toggleVisible = await minimizedToggle.isVisible().catch(() => false);
    if (toggleVisible) {
      await minimizedToggle.click();
      const restoreButton = minimizedDialog.getByTestId(`restore-session-${sessionId}`);
      if (await restoreButton.isVisible().catch(() => false)) {
        await restoreButton.click();
      }
      const closeButton = minimizedDialog.getByRole("button", { name: "Close" });
      if (await closeButton.isVisible().catch(() => false)) {
        await closeButton.click();
      }
    }
  }
  await expect(tab.first(), `Session tab for ${sessionId} should be visible`).toBeVisible({
    timeout: 15_000,
  });
  await tab.first().click();
  await expect(input).toBeVisible({
    timeout: 20_000,
  });
}

export async function ensureCliVisible(page: Page, expectedCount: number): Promise<void> {
  const creator = page.getByTestId("session-create-panel").last();
  const cliSelect = creator.getByTestId("session-create-cli");
  const visible = await cliSelect.isVisible().catch(() => false);
  if (!visible) {
    const addButton = page.getByTestId("workspace-add-session");
    await expect(addButton).toBeEnabled({ timeout: 10_000 });
    await addButton.click();
  }
  await expect(cliSelect).toBeVisible({ timeout: 15_000 });
  await expect
    .poll(
      async () =>
        await cliSelect
          .locator("option")
          .evaluateAll((nodes) =>
            nodes.filter(
              (node) =>
                "value" in node &&
                typeof (node as HTMLSelectElement).value === "string" &&
                (node as HTMLSelectElement).value.trim().length > 0,
            ).length,
          ),
      { timeout: 15_000 },
    )
    .toBeGreaterThanOrEqual(expectedCount);
}

export function attachPageConsoleLogger(
  page: Page,
  info: TestInfo,
  label: string,
): void {
  const logPath = info.outputPath(`${label}-page-console.log`);
  mkdirSync(dirname(logPath), { recursive: true });
  page.on("console", (message) => {
    const entry = `[${new Date().toISOString()}][${message.type()}] ${message.text()}\n`;
    appendFileSync(logPath, entry);
  });
}

export function writeTestLog(info: TestInfo, message: string): void {
  const logPath = info.outputPath(`test.log`);
  mkdirSync(dirname(logPath), { recursive: true });
  appendFileSync(
    logPath,
    `[${new Date().toISOString()}][${info.status ?? "running"}] ${message}\n`,
  );
}

export async function registerCli(
  request: APIRequestContext,
  cliId: string,
  label: string,
): Promise<void> {
  await request.post(`${BACKEND_URL}/api/clis/register`, {
    data: { cliId, label },
  });
}

export async function expectCliInUi(page: Page, label: string): Promise<void> {
  await expect(page.locator('section:has-text("CLIs") ul li', { hasText: label })).toBeVisible({
    timeout: 15_000,
  });
}

export async function expectLogEntry(page: Page, text: string): Promise<void> {
  const matching = page.locator('[data-testid="client-logs"] li', {
    hasText: text,
  });
  await expect(matching.first()).toBeVisible({ timeout: 15_000 });
}

export async function expectLogCount(page: Page, minimum: number): Promise<void> {
  const locator = page.locator("[data-testid='client-logs'] li");
  const timeoutMs = 15_000;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const count = await locator.count();
    if (count >= minimum) {
      return;
    }
    await page.waitForTimeout(200);
  }
  throw new Error(`Expected at least ${minimum} log entries`);
}

export function getAssistantMessages(page: Page, sessionId: string) {
  return page.locator(
    `[data-testid='session-timeline-${sessionId}'] [data-event-type='message'][data-role='assistant']`,
  );
}

export async function fetchSessionEventStats(
  request: APIRequestContext,
): Promise<{
  eventsAppended?: Record<string, number>;
  assistantChunkEmits?: Record<string, number>;
}> {
  const res = await request.get(`${BACKEND_URL}/api/debug/session-event-stats`);
  if (!res.ok()) {
    throw new Error("Failed to fetch session event stats");
  }
  return res.json();
}

export async function getAssistantChunkCount(
  request: APIRequestContext,
  sessionId: string,
): Promise<number> {
  const stats = await fetchSessionEventStats(request);
  return stats.assistantChunkEmits?.[sessionId] ?? 0;
}

export async function sendMessageAndExpectAssistant(
  page: Page,
  sessionId: string,
  message: string,
  expected: string | RegExp,
  options?: { timeout?: number; captureText?: boolean },
): Promise<{ text: string } | void> {
  const assistantMessages = getAssistantMessages(page, sessionId);
  const initialCount = await assistantMessages.count();
  const input = page.getByTestId(`session-input-${sessionId}`);
  await input.fill(message);
  await page.getByTestId(`session-send-${sessionId}`).click({ force: true });
  const timeout = options?.timeout ?? 15_000;
  const newCount = await waitForAssistantCount(page, assistantMessages, initialCount + 1, timeout);
  const target = assistantMessages.nth(newCount - 1);
  if (typeof expected === "string") {
    await expect(target).toContainText(expected, { timeout });
  } else {
    await expect(target).toHaveText(expected, { timeout });
  }
  if (options?.captureText) {
    const text = await waitForStableLocatorText(page, target, timeout);
    return { text };
  }
}

export async function expectLatestAssistantMessage(
  page: Page,
  sessionId: string,
  expected: string | RegExp,
  options?: { timeout?: number },
): Promise<void> {
  const assistantMessages = getAssistantMessages(page, sessionId);
  const timeout = options?.timeout ?? 10_000;
  await waitForAssistantCount(page, assistantMessages, 1, timeout);
  const target = assistantMessages.last();
  if (typeof expected === "string") {
    await expect(target).toContainText(expected, { timeout });
  } else {
    await expect(target).toHaveText(expected, { timeout });
  }
}

async function waitForAssistantCount(
  page: Page,
  assistantMessages: ReturnType<typeof getAssistantMessages>,
  minCount: number,
  timeout: number,
): Promise<number> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const current = await assistantMessages.count();
    if (current >= minCount) {
      return current;
    }
    await page.waitForTimeout(200);
  }
  throw new Error(`Timed out waiting for assistant responses to reach ${minCount}`);
}

async function waitForStableLocatorText(
  page: Page,
  locator: Locator,
  totalTimeout: number,
): Promise<string> {
  const settleThresholdMs = 500;
  const pollIntervalMs = 100;
  const startedAt = Date.now();
  let lastText = await locator.innerText();
  let stableFor = 0;
  while (Date.now() - startedAt < totalTimeout) {
    await page.waitForTimeout(pollIntervalMs);
    const current = await locator.innerText();
    if (current === lastText) {
      stableFor += pollIntervalMs;
      if (stableFor >= settleThresholdMs) {
        return current;
      }
    } else {
      lastText = current;
      stableFor = 0;
    }
  }
  return lastText;
}

export async function createSessionViaUi(
  page: Page,
  request: APIRequestContext,
  options?: { workdir?: string; model?: string; cliId?: string },
): Promise<string> {
  const current = await request.get(`${BACKEND_URL}/api/sessions`);
  const currentData = await current.json();
  const startingCount = Array.isArray(currentData?.sessions)
    ? currentData.sessions.length
    : 0;
  const creator = page.getByTestId("session-create-panel").last();
  const visible = await creator.isVisible().catch(() => false);
  if (!visible) {
    const addButton = page.getByTestId("workspace-add-session");
    await expect(addButton).toBeEnabled({ timeout: 10_000 });
    await addButton.click();
    await expect(creator).toBeVisible({ timeout: 10_000 });
  }
  if (options?.cliId) {
    await creator.getByTestId("session-create-cli").selectOption(options.cliId);
  }
  if (options?.workdir) {
    await creator.getByLabel("Workdir:").fill(options.workdir);
  }
  if (options?.model) {
    await creator.getByLabel("Model:").fill(options.model);
  }
  const submitButton = creator.getByRole("button", { name: "Create Session" });
  await submitButton.evaluate((button) => (button as HTMLButtonElement).click());
  const sessions = await waitForSessionCount(request, startingCount + 1);
  const sessionId = sessions[sessions.length - 1]?.id;
  if (!sessionId) {
    throw new Error("Failed to create session");
  }
  await expect(
    page.getByTestId(`session-input-${sessionId}`),
  ).toBeVisible({ timeout: 20_000 });
  return sessionId;
}

export async function appendTimelineEvents(
  request: APIRequestContext,
  sessionId: string,
  events: Array<Record<string, unknown>>,
): Promise<void> {
  const res = await request.post(`${BACKEND_URL}/api/debug/sessions/${sessionId}/events`, {
    data: { events },
  });
  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`Failed to append timeline events (${res.status()}): ${body}`);
  }
}
