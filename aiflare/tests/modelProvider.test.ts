import { describe, it, expect } from "vitest";

import { getDefaultModelProviderInfo } from "../src/backend/modelProvider.js";

describe("modelProvider", () => {
  it("returns defaults for known providers", () => {
    const openai = getDefaultModelProviderInfo("openai");
    expect(openai).not.toBeNull();
    expect(openai?.name).toBe("OpenAI");
    expect(openai?.wireApi).toBe("responses");
    expect(openai?.requiresOpenaiAuth).toBe(true);

    const ollama = getDefaultModelProviderInfo("ollama");
    expect(ollama).not.toBeNull();
    expect(ollama?.name).toBe("Ollama");
    expect(ollama?.wireApi).toBe("chat-completions");
    expect(ollama?.requiresOpenaiAuth).toBe(false);
  });

  it("returns null for unknown providers", () => {
    const unknown = getDefaultModelProviderInfo("does-not-exist");
    expect(unknown).toBeNull();
  });
});

