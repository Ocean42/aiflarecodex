import { expect, type APIRequestContext, type Page } from "@playwright/test";

const BACKEND_PORT = process.env["E2E_BACKEND_PORT"] ?? "4123";
const FRONTEND_PORT = process.env["E2E_FRONTEND_PORT"] ?? "5174";
export const BACKEND_URL =
  process.env["E2E_BACKEND_URL"] ?? `http://127.0.0.1:${BACKEND_PORT}`;
export const FRONTEND_URL =
  process.env["E2E_FRONTEND_URL"] ?? `http://127.0.0.1:${FRONTEND_PORT}`;

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

export async function waitForSessionViaApi(request: APIRequestContext): Promise<string> {
  const timeoutMs = 15_000;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await request.get(`${BACKEND_URL}/api/sessions`);
    const data = await res.json();
    if (data?.sessions?.length) {
      return data.sessions[data.sessions.length - 1].id as string;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Session not created in time");
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

export async function ensureCliVisible(page: Page, expectedCount: number): Promise<void> {
  const listLocator = page.locator("[data-testid='cli-list'] li");
  const timeoutMs = 15_000;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const count = await listLocator.count();
    if (count >= expectedCount) {
      break;
    }
    await page.waitForTimeout(200);
  }
  const finalCount = await listLocator.count();
  if (finalCount < expectedCount) {
    throw new Error(`Expected at least ${expectedCount} CLI entries, saw ${finalCount}`);
  }
  const cliSelect = page.locator('section:has-text("Sessions") label:has-text("CLI:") select');
  await cliSelect.locator('option:not([value=""])').first().waitFor({
    state: "attached",
    timeout: 15_000,
  });
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
