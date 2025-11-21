import { defineConfig } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendPort = process.env["E2E_FRONTEND_PORT"] ?? "5174";
const baseURL = process.env["E2E_FRONTEND_URL"] ?? `http://127.0.0.1:${frontendPort}`;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  retries: 0,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL,
    trace: "on-first-retry",
    video: (process.env["PLAYWRIGHT_VIDEO"] as "on" | "off" | "retain-on-failure" | undefined) ?? "retain-on-failure",
  },
  globalSetup: path.join(__dirname, "tests/e2e/global-setup.ts"),
});
