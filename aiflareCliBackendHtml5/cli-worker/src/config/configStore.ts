import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

export interface CliWorkerConfig {
  cliId: string;
  backendUrl: string;
  sessionToken: string;
  label: string;
  lastUpdated: string;
}

export class ConfigStore {
  private readonly configPath: string;

  constructor(customPath?: string) {
    this.configPath =
      customPath ??
      path.join(
        os.homedir(),
        ".aiflare",
        "cli-worker",
        "config.json",
      );
  }

  async load(): Promise<CliWorkerConfig | null> {
    try {
      const raw = await fs.readFile(this.configPath, "utf-8");
      return JSON.parse(raw) as CliWorkerConfig;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  async save(config: CliWorkerConfig): Promise<void> {
    await fs.mkdir(path.dirname(this.configPath), { recursive: true });
    await fs.writeFile(
      this.configPath,
      JSON.stringify({ ...config, lastUpdated: new Date().toISOString() }, null, 2),
      "utf-8",
    );
  }
}
