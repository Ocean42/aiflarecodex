import { describe, it, expect } from "vitest";

import { fetchBackendRateLimits } from "../src/backend/status.js";

describe("backend integration – rate limits", () => {
  it("fetches rate limits from the real ChatGPT backend when credentials are present", async () => {
    const result = await fetchBackendRateLimits();

    // If no credentials are configured we cannot meaningfully talk to the
    // backend. In that case we treat this test as a no‑op so CI and other
    // environments without a logged‑in ChatGPT session do not fail.
    if (
      !result.snapshot &&
      result.error &&
      result.error.includes("No ChatGPT credentials")
    ) {
      // Soft assertion so the test suite stays green in environments without auth.
      expect(result.snapshot).toBeNull();
      return;
    }

    // In a logged‑in environment (like your local setup) we expect a successful
    // call with a non‑null snapshot and no error message.
    expect(result.error).toBeUndefined();
    expect(result.snapshot).not.toBeNull();
  });
});
