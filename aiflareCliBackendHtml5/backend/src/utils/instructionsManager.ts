// @ts-nocheck
import { readFileSync } from "node:fs";
const INSTRUCTION_PATHS = [
    "../resources/codex-instructions.txt", // src tree / ts-node
    "./resources/codex-instructions.txt", // bundled dist output
];
let cachedInstructions = null;
export class InstructionsManager {
    static getDefaultInstructions() {
        if (cachedInstructions === null) {
            let lastError;
            for (const rel of INSTRUCTION_PATHS) {
                try {
                    const path = new URL(rel, import.meta.url);
                    cachedInstructions = readFileSync(path, "utf-8").trim();
                    return cachedInstructions;
                }
                catch (err) {
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
