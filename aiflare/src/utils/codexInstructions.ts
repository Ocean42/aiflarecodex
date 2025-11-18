import { readFileSync } from "node:fs";

const instructionsPath = new URL(
  "./resources/codex-instructions.txt",
  import.meta.url,
);

export const CODEX_INSTRUCTIONS = readFileSync(instructionsPath, "utf-8");
