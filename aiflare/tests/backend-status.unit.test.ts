import { describe, it, expect, vi } from "vitest";

vi.mock("../src/backend/auth.js", () => ({
  __esModule: true,
  loadAuthTokens: vi.fn(),
  getChatgptBaseUrl: () => "https://chatgpt.com/backend-api",
}));

const loadAuthTokensMock = (
  await import("../src/backend/auth.js")
).loadAuthTokens as unknown as ReturnType<typeof vi.fn>;

vi.mock("../src/backend/client.js", () => ({
  __esModule: true,
  BackendClient: vi.fn().mockImplementation(() => ({
    getRateLimits: vi.fn().mockResolvedValue({
      primary: null,
      secondary: null,
    }),
  })),
}));

import { fetchBackendRateLimits } from "../src/backend/status.js";

describe("fetchBackendRateLimits – unit", () => {
  it("returns an error when no tokens are present", async () => {
    loadAuthTokensMock.mockResolvedValueOnce(null);

    const result = await fetchBackendRateLimits();

    expect(result.snapshot).toBeNull();
    expect(result.error).toMatch(/No ChatGPT credentials/i);
  });

  it("returns a snapshot when BackendClient succeeds", async () => {
    loadAuthTokensMock.mockResolvedValueOnce({
      id_token: "id",
      access_token: "access",
      refresh_token: "refresh",
    });

    const result = await fetchBackendRateLimits();

    expect(result.error).toBeUndefined();
    expect(result.snapshot).not.toBeNull();
    expect(result.snapshot?.primary).toBeNull();
    expect(result.snapshot?.secondary).toBeNull();
  });
});

