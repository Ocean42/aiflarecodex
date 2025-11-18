import { readFileSync } from "node:fs";

const INSTRUCTION_PATHS = [
  "../resources/codex-instructions.txt", // src tree / ts-node
  "./resources/codex-instructions.txt", // bundled dist output
];

let cachedInstructions: string | null = null;

export class InstructionsManager {
  static getDefaultInstructions(): string {
    if (cachedInstructions === null) {
      let lastError: unknown;
      for (const rel of INSTRUCTION_PATHS) {
        try {
          const path = new URL(rel, import.meta.url);
          cachedInstructions = readFileSync(path, "utf-8").trim();
          return cachedInstructions;
        } catch (err) {
          lastError = err;
        }
      }
      throw lastError instanceof Error
        ? lastError
        : new Error(String(lastError));
    }
    return cachedInstructions;
  }
}
