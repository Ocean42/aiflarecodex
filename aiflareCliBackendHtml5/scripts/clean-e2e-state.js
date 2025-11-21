#!/usr/bin/env node
import { rmSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const sessionsDir = path.join(repoRoot, "backend", "data", "sessions");

try {
  rmSync(sessionsDir, { recursive: true, force: true });
} catch (error) {
  console.warn("[clean-e2e] failed to remove sessions dir", error);
}

try {
  mkdirSync(sessionsDir, { recursive: true });
} catch (error) {
  console.warn("[clean-e2e] failed to recreate sessions dir", error);
}
