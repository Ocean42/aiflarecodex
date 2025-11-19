import { describe, it, expect } from "vitest";

import { fetchBackendRateLimits } from "../src/backend/status.js";

describe("backend integration – rate limits", () => {
  it("fetches rate limits from the real ChatGPT backend when credentials are present", async () => {
    const result = await fetchBackendRateLimits();
    expect(result.error).toBeUndefined();
    expect(result.snapshot).not.toBeNull();
  });
});
