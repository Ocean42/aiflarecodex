import { mkdirSync } from "node:fs";
import path from "node:path";

/**
 * Central data directory helper. Resolves to `<backend cwd>/data`.
 */
export class DataDirectory {
  private static cachedPath: string | null = null;

  static getPath(): string {
    if (!this.cachedPath) {
      const base = path.resolve(process.cwd(), "data");
      mkdirSync(base, { recursive: true });
      this.cachedPath = base;
    }
    return this.cachedPath;
  }

  static resolve(...segments: Array<string>): string {
    return path.join(this.getPath(), ...segments);
  }
}
