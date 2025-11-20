import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import { mkdirSync, rmSync } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const backendScript = path.resolve(repoRoot, "backend/dist/index.js");
const cliScript = path.resolve(repoRoot, "cli-worker/dist/index.js");
const frontendDir = path.resolve(repoRoot, "frontend");
const tempDir = path.resolve(repoRoot, "tmp");
const cliConfigPath = path.resolve(tempDir, "cli-e2e-config.json");
const backendPort = Number(process.env["E2E_BACKEND_PORT"] ?? "4123");
const frontendPort = Number(process.env["E2E_FRONTEND_PORT"] ?? "5174");
const backendUrl = process.env["E2E_BACKEND_URL"] ?? `http://127.0.0.1:${backendPort}`;
const frontendUrl = process.env["E2E_FRONTEND_URL"] ?? `http://127.0.0.1:${frontendPort}`;

function killPort(port: number): void {
  try {
    const result = spawnSync("lsof", ["-ti", `:${port}`], { encoding: "utf-8" });
    if (result.error || !result.stdout) {
      return;
    }
    const pids = result.stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    for (const pid of pids) {
      try {
        process.kill(Number(pid), "SIGKILL");
      } catch {
        // ignore if the process already exited
      }
    }
  } catch {
    // lsof may not be available on all systems; ignore best-effort failures
  }
}

function waitForHttp(url: string, timeoutMs = 10_000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(url, (res) => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          res.resume();
          resolve();
        } else {
          res.resume();
          retry();
        }
      });
      req.on("error", retry);
    };
    const retry = () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Timed out waiting for ${url}`));
      } else {
        setTimeout(attempt, 250);
      }
    };
    attempt();
  });
}

export default async function globalSetup(): Promise<() => void> {
  killPort(backendPort);
  killPort(frontendPort);

  const backend = spawn("node", [backendScript], {
    env: { ...process.env, BACKEND_PORT: String(backendPort) },
    stdio: "inherit",
  });
  await waitForHttp(`${backendUrl}/api/health`);

  mkdirSync(tempDir, { recursive: true });
  rmSync(cliConfigPath, { force: true });

  const cli = spawn("node", [cliScript], {
    env: {
      ...process.env,
      BACKEND_URL: backendUrl,
      CLI_LABEL: "e2e-cli",
      CLI_CONFIG_PATH: cliConfigPath,
    },
    stdio: "inherit",
  });
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const frontend = spawn(
    "npm",
    ["run", "preview", "--", "--host=127.0.0.1", `--port=${frontendPort}`],
    {
      cwd: frontendDir,
      env: { ...process.env, VITE_BACKEND_URL: backendUrl },
      stdio: "inherit",
    },
  );
  await waitForHttp(`${frontendUrl}/`);

  return () => {
    backend.kill("SIGTERM");
    cli.kill("SIGTERM");
    frontend.kill("SIGTERM");
  };
}
