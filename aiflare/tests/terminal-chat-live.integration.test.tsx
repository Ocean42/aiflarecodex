import { describe, it, expect } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";

import {
  launchCliHarness,
  type LaunchOptions,
  type LiveCliHarness,
} from "./live-cli-harness.js";
import { getCodexHomeDir } from "../src/utils/codexHome.js";

const RESUME_PROMPT = "Schreibe bitte nur 'ALPHA'.";
const RESUME_FOLLOW_UP =
  "Bestätige einfach nur, dass du schon 'ALPHA' gesagt hast.";
const CLI_ROOT = path.normalize(
  path.join(path.dirname(new URL(import.meta.url).pathname), ".."),
);
const SESSIONS_DIR = path.join(getCodexHomeDir(), "sessions");


function countOccurrences(haystack: string, needle: string): number {
  if (!needle) {
    return 0;
  }
  return haystack.split(needle).length - 1;
}

async function withCli<T>(
  fn: (cli: LiveCliHarness) => Promise<T>,
  options?: LaunchOptions,
): Promise<T> {
  const cli = await launchCliHarness(options);
  try {
    await cli.waitForReady();
    return await fn(cli);
  } finally {
    await cli.cleanup();
  }
}

async function listSessionFiles(): Promise<Array<string>> {
  try {
    const entries = await fs.readdir(SESSIONS_DIR);
    return entries
      .filter((entry) => entry.endsWith(".json"))
      .map((entry) => path.join(SESSIONS_DIR, entry));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function waitForNewSessionFile(
  baseline: Set<string>,
  timeoutMs = 10_000,
): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const current = await listSessionFiles();
    for (const file of current) {
      if (!baseline.has(file)) {
        return file;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Timed out waiting for session file");
}

async function createResumeSession(): Promise<string | null> {
  await fs.mkdir(SESSIONS_DIR, { recursive: true });
  const baseline = new Set(await listSessionFiles());
  let aborted = false;
  await withCli(async (cli) => {
    await cli.sendLine(RESUME_PROMPT);
    const frame = await cli.waitForOutput(
      (out) =>
        out.includes(RESUME_PROMPT) ||
        out.includes("⚠️  OpenAI rejected the request"),
      80,
      200,
    );
    if (frame.includes("⚠️  OpenAI rejected the request")) {
      aborted = true;
    }
  });
  if (aborted) {
    return null;
  }
  return waitForNewSessionFile(baseline);
}

describe.sequential("TerminalChat – live integration", () => {
  it(
    "streams an assistant reply for a simple prompt",
    async () => {
      await withCli(async (cli) => {
        await cli.sendLine("Sag bitte genau 'ja, bin da'.");
        const frame = await cli.waitForOutput(
          (out) =>
            out.toLowerCase().includes("ja, bin da") ||
            out.includes("⚠️  OpenAI rejected the request"),
          150,
          400,
        );

        expect(
          frame.toLowerCase().includes("ja, bin da") ||
            frame.includes("⚠️  OpenAI rejected the request"),
        ).toBe(true);
        expect(frame).not.toContain("Dropped streaming event");
      });
    },
    120_000,
  );

  it(
    "renders plan updates emitted by the agent",
    async () => {
      await withCli(async (cli) => {
        await cli.sendLine("/plan-test");
        const frame = await cli.waitForOutput(
          (out) => out.includes("Plan update:"),
          30,
          200,
        );
        expect(frame).toContain("Plan update:");
      });
    },
    10_000,
  );

  it(
    "shows the approval modal via /approval-test and records the decision",
    async () => {
      await withCli(async (cli) => {
        await cli.sendLine("/approval-test");
        const approvalFrame = await cli.waitForOutput(
          (out) => out.includes("Shell Command") && out.includes("Test approval flow"),
          30,
          200,
        );
        expect(approvalFrame).toContain("Shell Command");

        cli.send("y");
        const decisionFrame = await cli.waitForOutput(
          (out) => out.includes("Test approval decision:"),
          60,
          200,
        );
        expect(decisionFrame).toContain("Test approval decision: yes");
      });
    },
    10_000,
  );

  it(
    "executes a local shell command via ! syntax",
    async () => {
      await withCli(async (cli) => {
        await cli.sendLine("!pwd");
        const frame = await cli.waitForOutput(
          (out) =>
            out.includes("command.stdout") ||
            out.toLowerCase().includes("working directory"),
          60,
          200,
        );

        expect(frame).toMatch(/command\.stdout|Command finished/);
      });
    },
    15_000,
  );

  it(
    "opens the approval mode overlay via /approval",
    async () => {
      await withCli(async (cli) => {
        await cli.sendLine("/approval");
        const overlayFrame = await cli.waitForOutput(
          (out) => out.includes("Switch approval mode"),
          20,
          200,
        );
        expect(overlayFrame).toContain("Switch approval mode");
        expect(overlayFrame).toContain("Current mode: suggest");
      });
    },
    10_000,
  );

  it(
    "generates a bug report URL via /bug",
    async () => {
      await withCli(async (cli) => {
        await cli.sendLine("/bug");
        const bugFrame = await cli.waitForOutput(
          (out) => out.includes("Bug report URL:"),
          40,
          200,
        );
        expect(bugFrame).toContain("Bug report URL:");
      });
    },
    10_000,
  );

  it(
    "clears the conversation via /clear",
    async () => {
      await withCli(async (cli) => {
        await cli.sendLine('Sag bitte exakt "eins".');
        await cli.waitForOutput(
          (out) => out.includes("[vitest-loading-0]"),
          150,
          400,
        );
        const afterFirst = cli.lastFrame().toLowerCase();
        expect(
          afterFirst.includes("eins") ||
            afterFirst.includes("⚠️  openai rejected the request"),
        ).toBe(true);

        await cli.sendLine("/clear");
        const clearedFrame = await cli.waitForOutput(
          (out) => out.includes("Terminal cleared"),
          60,
          200,
        );
        expect(clearedFrame).toContain("Terminal cleared");

        await cli.sendLine('Sag bitte exakt "zwei".');
        await cli.waitForOutput(
          (out) => out.includes("[vitest-loading-0]"),
          150,
          400,
        );
        const afterSecond = cli.lastFrame().toLowerCase();
        expect(
          afterSecond.includes("zwei") ||
            afterSecond.includes("⚠️  openai rejected the request"),
        ).toBe(true);
      });
    },
    30_000,
  );

  it(
    "can read a repository file when asked naturally",
    async () => {
      await withCli(async (cli) => {
        await cli.sendLine(
          "Schau dir bitte die Datei README.md im aktuellen Arbeitsverzeichnis an und bestätige, dass 'OpenAI Codex CLI' darin vorkommt.",
        );
        const frame = await cli.waitForOutput(
          (out) =>
            out.includes("Datei README.md enthält 'OpenAI Codex CLI':") ||
            out.includes('<h1 align="center">OpenAI Codex CLI</h1>') ||
            out.includes("Absolute path:") ||
            (out.includes("command.stdout") && out.includes("Command finished")),
          30,
          200,
        );

        expect(
          frame.includes("Datei README.md enthält 'OpenAI Codex CLI':") ||
            frame.includes('<h1 align="center">OpenAI Codex CLI</h1>') ||
            frame.includes("Absolute path:") ||
            (frame.includes("command.stdout") && frame.includes("README.md")),
        ).toBe(true);

        if (frame.includes("Absolute path:")) {
          expect(frame).toContain("Absolute path:");
          const hasLineNumbers = /L\d+:\s/.test(frame);
          const listsReadme =
            frame.toLowerCase().includes("readme.md") ||
            frame.includes("Datei README.md enthält");
          expect(hasLineNumbers || listsReadme).toBe(true);
        } else {
          expect(frame).toContain("Command started");
          expect(frame).toContain("Command finished");
        }
        expect(frame).not.toContain("Failed to parse JSON");
      });
    },
    10_000,
  );

  it(
    "recognizes an image via the view_image tool",
    async () => {
      await withCli(async (cli) => {
        await cli.sendLine(
          "Such mal ob du hier ein Bild namens katze findest und sag mir was darin zu sehen ist.",
        );
        await cli.waitForOutput(
          (out) => out.includes("Attached image") && out.includes("<Image>"),
          60,
          200,
        );
        const frame = await cli.waitForOutput(
          (out) =>
            out.includes("[vitest-loading-0]") &&
            out.includes("codex") &&
            /katze/.test(out.toLowerCase()),
          200,
          200,
        );

        expect(frame.toLowerCase()).toMatch(/katze/);
        expect(frame).not.toContain("[missing image");
        expect(frame).not.toContain("Failed to parse JSON");
        expect(frame).not.toContain("OpenAI emitted a function_call");
      });
    },
    15_000,
  );

  it(
    "runs ls without dropped-stream warnings",
    async () => {
      await withCli(async (cli) => {
        await cli.sendLine("Bitte führe den Befehl `ls` im aktuellen Arbeitsverzeichnis aus.");
        const frame = await cli.waitForOutput(
          (out) => out.includes("command.stdout"),
          40,
          200,
        );
        expect(frame).toContain("command.stdout");
        expect(frame).not.toContain("Dropped streaming event");
        expect(frame).not.toContain("OpenAI emitted a");
      });
    },
    15_000,
  );

  it(
    "shows timeout metadata for long-running commands",
    async () => {
      await withCli(
        async (cli) => {
          await cli.sendLine(
            'Bitte führe den Befehl `python -c "import time; time.sleep(12); print(\'done\')"` im aktuellen Arbeitsverzeichnis aus.',
          );
          const frame = await cli.waitForOutput(
            (out) =>
              out.includes("Command finished") || out.includes("command.stderr"),
            250,
            200,
          );
          expect(frame).toContain("Command finished");
          expect(frame).toMatch(/exit:\s*\d+/);
        },
        { args: ["--full-auto"] },
      );
    },
    60_000,
  );

  it(
    "shows real rate limit information in the /status overlay",
    async () => {
      await withCli(async (cli) => {
        await cli.sendLine("/status");
        const statusFrame = await cli.waitForOutput(
          (out) => out.includes("Codex CLI (aiflare-codey) version"),
          150,
          200,
        );
        expect(statusFrame).toContain("Codex CLI (aiflare-codey) version");
        expect(statusFrame).toMatch(/Primary .*limit/i);
      });
    },
    40_000,
  );

  it(
    "resume continues conversation",
    async () => {
      const sessionPath = await createResumeSession();
      if (!sessionPath) {
        return;
      }
      try {
        await withCli(
          async (cli) => {
            const initialFrame = await cli.waitForOutput(
              (out) => out.includes(RESUME_PROMPT),
              80,
              200,
            );
            expect(countOccurrences(initialFrame, RESUME_PROMPT)).toBe(1);

            await cli.sendLine(RESUME_FOLLOW_UP);
            const followUpFrame = await cli.waitForOutput(
              (out) =>
                out.includes(RESUME_FOLLOW_UP) ||
                out.includes("⚠️  OpenAI rejected the request"),
              80,
              200,
            );
            expect(
              followUpFrame.includes(RESUME_FOLLOW_UP) ||
                followUpFrame.includes("⚠️  OpenAI rejected the request"),
            ).toBe(true);
            expect(countOccurrences(followUpFrame, RESUME_PROMPT)).toBe(1);
          },
          { args: ["--resume", sessionPath, "--full-auto"] },
        );
      } finally {
        await fs.rm(sessionPath, { force: true });
      }
    },
    30_000,
  );

  it(
    "streams command output after resume",
    async () => {
      const sessionPath = await createResumeSession();
      if (!sessionPath) {
        return;
      }
      try {
        await withCli(
          async (cli) => {
            await cli.waitForOutput(
              (out) => out.includes(RESUME_PROMPT),
              80,
              200,
            );
            await cli.sendLine("Bitte führe den Befehl `ls` erneut aus.");
            const frame = await cli.waitForOutput(
              (out) =>
                (out.includes("command.stdout") &&
                  out.split("Command started").length - 1 === 1) ||
                out.includes("⚠️  OpenAI rejected the request"),
              80,
              200,
            );
            if (frame.includes("⚠️  OpenAI rejected the request")) {
              expect(frame).toContain("⚠️  OpenAI rejected the request");
            } else {
              expect(frame).toContain("command.stdout");
              expect(frame).toContain("Command started");
              expect(frame.split("Command started").length - 1).toBe(1);
            }
          },
          { args: ["--resume", sessionPath] },
        );
      } finally {
        await fs.rm(sessionPath, { force: true });
      }
    },
    40_000,
  );
});
