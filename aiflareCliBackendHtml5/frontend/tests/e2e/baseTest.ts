import { test as base, expect } from "@playwright/test";
import { attachPageConsoleLogger, writeTestLog } from "./utils.js";

export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    const label = testInfo.title.replace(/\s+/g, "-").toLowerCase();
    attachPageConsoleLogger(page, testInfo, label);
    writeTestLog(testInfo, `[START] ${testInfo.title}`);
    try {
      await use(page);
    } finally {
      writeTestLog(
        testInfo,
        `[END] ${testInfo.title} status=${testInfo.status ?? "unknown"}`,
      );
    }
  },
});

export { expect };
