import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ConfigStore, type CliWorkerConfig } from "../src/config/configStore.js";

function createTempFilePath(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "cli-store-"));
  return path.join(dir, "config.json");
}

describe("ConfigStore", () => {
  let configPath: string;

  beforeEach(() => {
    configPath = createTempFilePath();
  });

  it("returns null when config file does not exist", async () => {
    const store = new ConfigStore(configPath);
    const result = await store.load();
    expect(result).toBeNull();
    rmSync(path.dirname(configPath), { recursive: true, force: true });
  });

  it("saves and loads config data", async () => {
    const store = new ConfigStore(configPath);
    const config: CliWorkerConfig = {
      cliId: "cli_test",
      backendUrl: "http://localhost:9999",
      sessionToken: "token-123",
      label: "Test CLI",
      lastUpdated: new Date().toISOString(),
    };

    await store.save(config);
    const loaded = await store.load();
    expect(loaded).not.toBeNull();
    expect(loaded).toMatchObject({
      cliId: "cli_test",
      backendUrl: "http://localhost:9999",
      label: "Test CLI",
    });
    rmSync(path.dirname(configPath), { recursive: true, force: true });
  });
});
