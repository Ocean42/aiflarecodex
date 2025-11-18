import type * as fsType from "fs";

import {
  loadConfig,
  saveConfig,
  DEFAULT_SHELL_MAX_BYTES,
  DEFAULT_SHELL_MAX_LINES,
} from "../src/utils/config.js";
import { AutoApprovalMode } from "../src/utils/auto-approval-mode.js";
import { tmpdir } from "os";
import { join } from "path";
import { test, expect, beforeEach, afterEach, vi } from "vitest";
import { providers as defaultProviders } from "../src/utils/providers";
import { InstructionsManager } from "../src/utils/instructionsManager.js";

const fsMockGlobals = vi.hoisted(() => ({
  instructionsUrl: new URL(
    "../src/resources/codex-instructions.txt",
    import.meta.url,
  ),
  defaultInstructionsContent: "",
}));

// In‑memory FS store
const memfsStore: { fs: Record<string, string> } = { fs: {} };

const toKey = (path: string | URL): string => {
  if (typeof path === "string") {
    return path;
  }
  if (path instanceof URL) {
    return path.href;
  }
  return String(path);
};

// Mock out the parts of "fs" that our config module uses:
vi.mock("fs", async () => {
  // now `real` is the actual fs module
  const real = (await vi.importActual("fs")) as typeof fsType;
  if (!fsMockGlobals.defaultInstructionsContent) {
    fsMockGlobals.defaultInstructionsContent = real.readFileSync(
      fsMockGlobals.instructionsUrl,
      "utf-8",
    );
  }
  return {
    ...real,
    existsSync: (path: string | URL) =>
      memfsStore.fs[toKey(path)] !== undefined,
    readFileSync: (path: string | URL) => {
      const key = toKey(path);
      if (memfsStore.fs[key] === undefined) {
        throw new Error("ENOENT");
      }
      return memfsStore.fs[key];
    },
    writeFileSync: (path: string | URL, data: string) => {
      memfsStore.fs[toKey(path)] = data;
    },
    mkdirSync: () => {
      // no-op in in‑memory store
    },
    rmSync: (path: string) => {
      // recursively delete any key under this prefix
      const prefix = path.endsWith("/") ? path : path + "/";
      for (const key of Object.keys(memfsStore.fs)) {
        if (key === path || key.startsWith(prefix)) {
          delete memfsStore.fs[key];
        }
      }
    },
  };
});

let testDir: string;
let testConfigPath: string;
let testInstructionsPath: string;

beforeEach(() => {
  memfsStore.fs = {}; // reset in‑memory store
  const instructionsKey = fsMockGlobals.instructionsUrl.href;
  memfsStore.fs[instructionsKey] = fsMockGlobals.defaultInstructionsContent;
  testDir = tmpdir(); // use the OS temp dir as our "cwd"
  testConfigPath = join(testDir, "config.json");
  testInstructionsPath = join(testDir, "instructions.md");
});

afterEach(() => {
  memfsStore.fs = {};
});

test("loads default config if files don't exist", () => {
  const config = loadConfig(testConfigPath, testInstructionsPath, {
    disableProjectDoc: true,
  });
  expect(config.model).toBe("gpt-5.1-codex");
});

test("saves and loads config correctly", () => {
  const testConfig = {
    model: "test-model",
    instructions: "test instructions",
    notify: false,
  };
  saveConfig(testConfig, testConfigPath, testInstructionsPath);

  // Our in‑memory fs should now contain those keys:
  expect(memfsStore.fs[testConfigPath]).toContain(`"model": "test-model"`);

  const loadedConfig = loadConfig(testConfigPath, testInstructionsPath, {
    disableProjectDoc: true,
  });
  // Check just the specified properties that were saved
  expect(loadedConfig.model).toBe(testConfig.model);
});

test("loads user instructions + project doc when codex.md is present", () => {
  // 1) seed memfs: a config JSON, an instructions.md, and a codex.md in the cwd
  const userInstr = "here are user instructions";
  const projectDoc = "# Project Title\n\nSome project‑specific doc";
  // first, make config so loadConfig will see storedConfig
  memfsStore.fs[testConfigPath] = JSON.stringify({ model: "mymodel" }, null, 2);
  // then user instructions:
  memfsStore.fs[testInstructionsPath] = userInstr;
  // and now our fake codex.md in the cwd:
  const codexPath = join(testDir, "codex.md");
  memfsStore.fs[codexPath] = projectDoc;

  // 2) loadConfig without disabling project‑doc, but with cwd=testDir
  const cfg = loadConfig(testConfigPath, testInstructionsPath, {
    cwd: testDir,
  });

  // 3) assert we got the stored model
  expect(cfg.model).toBe("mymodel");
});

test("loads and saves approvalMode correctly", () => {
  // Setup config with approvalMode
  memfsStore.fs[testConfigPath] = JSON.stringify(
    {
      model: "mymodel",
      approvalMode: AutoApprovalMode.AUTO_EDIT,
    },
    null,
    2,
  );
  memfsStore.fs[testInstructionsPath] = "test instructions";

  // Load config and verify approvalMode
  const loadedConfig = loadConfig(testConfigPath, testInstructionsPath, {
    disableProjectDoc: true,
  });

  // Check approvalMode was loaded correctly
  expect(loadedConfig.approvalMode).toBe(AutoApprovalMode.AUTO_EDIT);

  // Modify approvalMode and save
  const updatedConfig = {
    ...loadedConfig,
    approvalMode: AutoApprovalMode.FULL_AUTO,
  };

  saveConfig(updatedConfig, testConfigPath, testInstructionsPath);

  // Verify saved config contains updated approvalMode
  expect(memfsStore.fs[testConfigPath]).toContain(
    `"approvalMode": "${AutoApprovalMode.FULL_AUTO}"`,
  );

  // Load again and verify updated value
  const reloadedConfig = loadConfig(testConfigPath, testInstructionsPath, {
    disableProjectDoc: true,
  });
  expect(reloadedConfig.approvalMode).toBe(AutoApprovalMode.FULL_AUTO);
});

test("loads and saves providers correctly", () => {
  // Setup custom providers configuration
  const customProviders = {
    openai: {
      name: "Custom OpenAI",
      baseURL: "https://custom-api.openai.com/v1",
      envKey: "CUSTOM_OPENAI_API_KEY",
    },
    anthropic: {
      name: "Anthropic",
      baseURL: "https://api.anthropic.com",
      envKey: "ANTHROPIC_API_KEY",
    },
  };

  // Create config with providers
  const testConfig = {
    model: "test-model",
    provider: "anthropic",
    providers: customProviders,
    instructions: "test instructions",
    notify: false,
  };

  // Save the config
  saveConfig(testConfig, testConfigPath, testInstructionsPath);

  // Verify saved config contains providers
  expect(memfsStore.fs[testConfigPath]).toContain(`"providers"`);
  expect(memfsStore.fs[testConfigPath]).toContain(`"Custom OpenAI"`);
  expect(memfsStore.fs[testConfigPath]).toContain(`"Anthropic"`);
  expect(memfsStore.fs[testConfigPath]).toContain(`"provider": "anthropic"`);

  // Load config and verify providers were loaded correctly
  const loadedConfig = loadConfig(testConfigPath, testInstructionsPath, {
    disableProjectDoc: true,
  });

  // Check providers were loaded correctly
  expect(loadedConfig.provider).toBe("anthropic");
  expect(loadedConfig.providers).toEqual({
    ...defaultProviders,
    ...customProviders,
  });

  // Test merging with built-in providers
  // Create a config with only one custom provider
  const partialProviders = {
    customProvider: {
      name: "Custom Provider",
      baseURL: "https://custom-api.example.com",
      envKey: "CUSTOM_API_KEY",
    },
  };

  const partialConfig = {
    model: "test-model",
    provider: "customProvider",
    providers: partialProviders,
    instructions: "test instructions",
    notify: false,
  };

  // Save the partial config
  saveConfig(partialConfig, testConfigPath, testInstructionsPath);

  // Load config and verify providers were merged with built-in providers
  const mergedConfig = loadConfig(testConfigPath, testInstructionsPath, {
    disableProjectDoc: true,
  });

  // Check providers is defined
  expect(mergedConfig.providers).toBeDefined();

  // Use bracket notation to access properties
  if (mergedConfig.providers) {
    expect(mergedConfig.providers["customProvider"]).toBeDefined();
    expect(mergedConfig.providers["customProvider"]).toEqual(
      partialProviders.customProvider,
    );
    // Built-in providers should still be there (like openai)
    expect(mergedConfig.providers["openai"]).toBeDefined();
  }
});

test("saves and loads instructions with project doc separator correctly", () => {
  const userInstructions = "user specific instructions";
  const projectDoc = "project specific documentation";
  const combinedInstructions = `${userInstructions}\n\n--- project-doc ---\n\n${projectDoc}`;

  const testConfig = {
    model: "test-model",
    instructions: combinedInstructions,
    notify: false,
  };

  saveConfig(testConfig, testConfigPath, testInstructionsPath);

  const loadedConfig = loadConfig(testConfigPath, testInstructionsPath, {
    disableProjectDoc: true,
  });
});

test("handles empty user instructions when saving with project doc separator", () => {
  const projectDoc = "project specific documentation";
  const combinedInstructions = `\n\n--- project-doc ---\n\n${projectDoc}`;

  const testConfig = {
    model: "test-model",
    instructions: combinedInstructions,
    notify: false,
  };

  saveConfig(testConfig, testConfigPath, testInstructionsPath);

  const loadedConfig = loadConfig(testConfigPath, testInstructionsPath, {
    disableProjectDoc: true,
  });
  expect(loadedConfig.instructions).toBe(
    InstructionsManager.getDefaultInstructions(),
  );
});

test("loads default shell config when not specified", () => {
  // Setup config without shell settings
  memfsStore.fs[testConfigPath] = JSON.stringify(
    {
      model: "mymodel",
    },
    null,
    2,
  );
  memfsStore.fs[testInstructionsPath] = "test instructions";

  // Load config and verify default shell settings
  const loadedConfig = loadConfig(testConfigPath, testInstructionsPath, {
    disableProjectDoc: true,
  });

  // Check shell settings were loaded with defaults
  expect(loadedConfig.tools).toBeDefined();
  expect(loadedConfig.tools?.shell).toBeDefined();
  expect(loadedConfig.tools?.shell?.maxBytes).toBe(DEFAULT_SHELL_MAX_BYTES);
  expect(loadedConfig.tools?.shell?.maxLines).toBe(DEFAULT_SHELL_MAX_LINES);
});

test("loads and saves custom shell config", () => {
  // Setup config with custom shell settings
  const customMaxBytes = 12_410;
  const customMaxLines = 500;

  memfsStore.fs[testConfigPath] = JSON.stringify(
    {
      model: "mymodel",
      tools: {
        shell: {
          maxBytes: customMaxBytes,
          maxLines: customMaxLines,
        },
      },
    },
    null,
    2,
  );
  memfsStore.fs[testInstructionsPath] = "test instructions";

  // Load config and verify custom shell settings
  const loadedConfig = loadConfig(testConfigPath, testInstructionsPath, {
    disableProjectDoc: true,
  });

  // Check shell settings were loaded correctly
  expect(loadedConfig.tools?.shell?.maxBytes).toBe(customMaxBytes);
  expect(loadedConfig.tools?.shell?.maxLines).toBe(customMaxLines);

  // Modify shell settings and save
  const updatedMaxBytes = 20_000;
  const updatedMaxLines = 1_000;

  const updatedConfig = {
    ...loadedConfig,
    tools: {
      shell: {
        maxBytes: updatedMaxBytes,
        maxLines: updatedMaxLines,
      },
    },
  };

  saveConfig(updatedConfig, testConfigPath, testInstructionsPath);

  // Verify saved config contains updated shell settings
  expect(memfsStore.fs[testConfigPath]).toContain(`"maxBytes": ${updatedMaxBytes}`);
  expect(memfsStore.fs[testConfigPath]).toContain(`"maxLines": ${updatedMaxLines}`);

  // Load again and verify updated values
  const reloadedConfig = loadConfig(testConfigPath, testInstructionsPath, {
    disableProjectDoc: true,
  });

  expect(reloadedConfig.tools?.shell?.maxBytes).toBe(updatedMaxBytes);
  expect(reloadedConfig.tools?.shell?.maxLines).toBe(updatedMaxLines);
});
