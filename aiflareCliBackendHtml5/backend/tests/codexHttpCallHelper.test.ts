import { describe, it, expect } from "vitest";
import { CodexHttpCallHelper } from "../src/utils/codexHttpCallHelper.js";
import { existsSync } from "node:fs";
import { getAuthFilePath } from "../src/utils/codexHome.js";

const authPath =
  process.env["CODEX_AUTH_FILE"] ?? getAuthFilePath();

const testFn = existsSync(authPath) ? it : it.skip;

describe("CodexHttpCallHelper", () => {
  testFn(
    "returns Hallo Welt on simple prompt",
    async () => {
      const reply = await CodexHttpCallHelper.callCodex(
        "hi ai antworte mir bitte exakt mit 'Hallo Welt'",
      );
      expect(reply).toContain("Hallo Welt");
    },
    60_000,
  );
});
