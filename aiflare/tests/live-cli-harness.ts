import type { ChildProcessWithoutNullStreams } from "node:child_process";

import { spawn } from "node:child_process";
import { once } from "node:events";
import path from "node:path";
import stripAnsi from "strip-ansi";
import { getCodexHomeDir } from "../src/utils/codexHome.js";

const AIFLARE_ROOT = path.normalize(
  path.join(path.dirname(new URL(import.meta.url).pathname), ".."),
);
const CLI_ENTRY = path.join(AIFLARE_ROOT, "dist/cli-dev.js");

let buildPromise: Promise<void> | null = null;

async function ensureDevBuild(): Promise<void> {
  if (!buildPromise) {
    buildPromise = new Promise((resolve, reject) => {
      const proc = spawn("node", ["build.mjs", "--dev"], {
        cwd: AIFLARE_ROOT,
        env: { ...process.env, NODE_ENV: "development" },
        stdio: "inherit",
      });
      proc.on("error", reject);
      proc.on("exit", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`build.mjs exited with code ${code ?? -1}`));
        }
      });
    });
  }
  await buildPromise;
}

export type LaunchOptions = {
  args?: Array<string>;
  env?: Record<string, string>;
};

export class LiveCliHarness {
  private output = "";
  private closed = false;
  private fatalError: Error | null = null;

  constructor(
    private readonly proc: ChildProcessWithoutNullStreams,
    public readonly codexHome: string,
  ) {
    const append = (chunk: Buffer | string) => {
      const str = typeof chunk === "string" ? chunk : chunk.toString("utf8");
      this.output += str;
      if (this.output.length > 200_000) {
        this.output = this.output.slice(-200_000);
      }
      this.detectFatalCondition(str);
    };
    this.proc.stdout.setEncoding("utf8");
    this.proc.stderr.setEncoding("utf8");
    this.proc.stdout.on("data", append);
    this.proc.stderr.on("data", append);
    this.proc.on("exit", () => {
      this.closed = true;
    });
  }

  clearOutput(): void {
    this.output = "";
  }

  lastFrame(): string {
    return stripAnsi(this.output);
  }

  send(text: string): void {
    this.ensureHealthy();
    if (!this.closed) {
      this.proc.stdin.write(text);
    }
  }

  async sendLine(text: string): Promise<void> {
    this.ensureHealthy();
    if (this.closed) {
      return;
    }
    for (const char of text) {
      this.send(char);
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
    this.send("\r");
  }

  async waitForOutput(
    predicate: (frame: string) => boolean,
    maxAttempts = 60,
    delayMs = 200,
  ): Promise<string> {
    this.ensureHealthy();
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const frame = this.lastFrame();
      if (predicate(frame)) {
        return frame;
      }
      if (this.closed) {
        throw new Error(
          `CLI exited before condition matched. Last frame:\n${frame}`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    throw new Error(`Timed out waiting for CLI output. Last frame:\n${this.lastFrame()}`);
  }

  async waitForReady(): Promise<void> {
    this.ensureHealthy();
    await this.waitForOutput(
      (out) =>
        out.includes("Averion AgentMan") || out.includes("Codex CLI (aiflare-codey)"),
      200,
      100,
    );
  }

  async cleanup(options?: { preserveHome?: boolean }): Promise<void> {
    if (!this.closed) {
      try {
        this.proc.stdin.write("\x03");
      } catch {
        // ignore if stdin already closed
      }
      await Promise.race([
        once(this.proc, "exit").then(() => undefined),
        new Promise((resolve) => setTimeout(resolve, 1000)),
      ]);
      if (!this.closed) {
        this.proc.kill("SIGKILL");
        await once(this.proc, "exit");
      }
    }
    if (options?.preserveHome) {
      return;
    }
    // Never delete the shared ~/.codey directory.
  }

  private detectFatalCondition(chunk: string): void {
    if (this.fatalError) {
      return;
    }
    const patterns = [/OpenAI emitted a function_call/i];
    for (const pattern of patterns) {
      if (pattern.test(chunk)) {
        this.fatalError = new Error(
          `CLI emitted fatal warning matching pattern ${pattern}: ${chunk}`,
        );
        this.proc.kill();
        break;
      }
    }
  }

  private ensureHealthy(): void {
    if (this.fatalError) {
      throw this.fatalError;
    }
  }
}

export async function launchCliHarness(
  options: LaunchOptions = {},
): Promise<LiveCliHarness> {
  await ensureDevBuild();
  const codexHome = getCodexHomeDir();
  const cliArgs = ["node", CLI_ENTRY, ...(options.args ?? [])];
  const pythonArgs = [
    "-c",
    `import pty, sys; sys.exit(pty.spawn(${JSON.stringify(cliArgs)}))`,
  ];
  const child = spawn("python3", pythonArgs, {
    cwd: AIFLARE_ROOT,
    env: {
      ...process.env,
      NODE_ENV: "development",
      FORCE_COLOR: "0",
      VITEST: "true",
      ...options.env,
    },
    stdio: "pipe",
  }) as ChildProcessWithoutNullStreams;

  return new LiveCliHarness(child, codexHome);
}
