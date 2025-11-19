import type { AgentResponseItem } from "../agent/agent-events.js";

import { loadConfig } from "../config";
import { log } from "../logger/log.js";
import fs from "fs/promises";
import path from "path";

import { getSessionsRoot } from "../codexHome.js";

type SaveRolloutOptions = {
  instructions?: string;
  model?: string;
  provider?: string;
  lastResponseId?: string | null;
  filePath?: string;
};

async function saveRolloutAsync(
  sessionId: string,
  items: Array<AgentResponseItem>,
  filePath: string,
  timestamp: string,
  options?: SaveRolloutOptions,
): Promise<void> {
  const config = loadConfig();
  const instructions =
    options?.instructions ?? config.instructions ?? "";
  const model = options?.model ?? config.model ?? "";
  const provider = options?.provider ?? config.provider ?? "openai";
  const lastResponseId = options?.lastResponseId ?? "";

  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(
      filePath,
      JSON.stringify(
        {
          session: {
            timestamp,
            id: sessionId,
            instructions,
            model,
            provider,
            lastResponseId,
          },
          items,
        },
        null,
        2,
      ),
      "utf8",
    );
  } catch (error) {
    log(`error: failed to save rollout to ${filePath}: ${error}`);
  }
}

export function saveRollout(
  sessionId: string,
  items: Array<AgentResponseItem>,
  options?: SaveRolloutOptions,
): string {
  const timestamp = new Date().toISOString();
  const ts = timestamp.replace(/[:.]/g, "-").slice(0, 10);
  const filename = `rollout-${ts}-${sessionId}.json`;
  const sessionsRoot = getSessionsRoot();
  const defaultPath = path.join(sessionsRoot, filename);
  const targetPath = options?.filePath ?? defaultPath;

  // Best-effort. We also do not log here in case of failure as that should be taken care of
  // by `saveRolloutAsync` already.
  saveRolloutAsync(sessionId, items, targetPath, timestamp, options).catch(
    () => {},
  );
  return targetPath;
}
