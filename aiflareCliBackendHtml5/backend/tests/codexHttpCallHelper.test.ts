import { describe, it, expect } from "vitest";
import { CodexHttpCallHelper } from "../src/utils/codexHttpCallHelper.js";
import { existsSync } from "node:fs";
import { getAuthFilePath } from "../src/utils/codexHome.js";

const authPath = getAuthFilePath();

const testFn = existsSync(authPath) ? it : it.skip;

describe("CodexHttpCallHelper", () => {
  testFn(
    "returns expected response on simple prompt",
    async () => {
      const reply = await CodexHttpCallHelper.callCodex(
        "Hi. Bitte antworte mir nur mit \"Hi, ich bin da!\"",
      );
      expect(reply.trim()).toBe("Hi, ich bin da!");
    },
    60_000,
  );
});
