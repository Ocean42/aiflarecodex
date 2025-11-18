import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import path from "path";

import type { AuthDotJson } from "../src/backend/authModel.js";
import {
  parseIdToken,
  loadAuthDotJsonSync,
  getAuthDebugInfoSync,
} from "../src/backend/authModel.js";
import { getAuthFilePath, getCodexHomeDir } from "../src/utils/codexHome.js";

const AUTH_FILE = getAuthFilePath();
const AUTH_DIR = getCodexHomeDir();

function writeAuthFile(data: unknown): void {
  if (!existsSync(AUTH_DIR)) {
    mkdirSync(AUTH_DIR, { recursive: true });
  }
  writeFileSync(AUTH_FILE, JSON.stringify(data, null, 2), "utf8");
}

beforeEach(() => {
  try {
    if (existsSync(AUTH_FILE)) {
      rmSync(AUTH_FILE);
    }
  } catch {
    // ignore
  }
});

afterEach(() => {
  try {
    if (existsSync(AUTH_FILE)) {
      rmSync(AUTH_FILE);
    }
  } catch {
    // ignore
  }
});

describe("parseIdToken", () => {
  it("extracts email and ChatGPT claims from a valid JWT", () => {
    const header = Buffer.from(
      JSON.stringify({ alg: "none", typ: "JWT" }),
      "utf8",
    ).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({
        email: "user@example.com",
        "https://api.openai.com/auth": {
          chatgpt_plan_type: "plus",
          chatgpt_account_id: "acc-123",
        },
      }),
      "utf8",
    ).toString("base64url");
    const token = `${header}.${payload}.`;

    const info = parseIdToken(token);

    expect(info.rawJwt).toBe(token);
    expect(info.email).toBe("user@example.com");
    expect(info.chatgptPlanType).toBe("plus");
    expect(info.chatgptAccountId).toBe("acc-123");
  });

  it("returns minimal info when payload is invalid", () => {
    const token = "not-a-jwt";
    const info = parseIdToken(token);
    expect(info.rawJwt).toBe(token);
    expect(info.email).toBeUndefined();
    expect(info.chatgptPlanType).toBeUndefined();
    expect(info.chatgptAccountId).toBeUndefined();
  });
});

describe("loadAuthDotJsonSync", () => {
  it("returns null when the auth file does not exist", () => {
    const auth = loadAuthDotJsonSync();
    expect(auth).toBeNull();
  });

  it("reads legacy token format and normalises to TokenData", () => {
    writeAuthFile({
      OPENAI_API_KEY: "sk-test",
      tokens: {
        id_token: "header.payload.sig",
        access_token: "access",
        refresh_token: "refresh",
        account_id: "acc-legacy",
      },
      last_refresh: "2025-01-01T00:00:00.000Z",
    });

    const auth = loadAuthDotJsonSync();
    expect(auth).not.toBeNull();

    const typed = auth as AuthDotJson;
    expect(typed.OPENAI_API_KEY).toBe("sk-test");
    expect(typed.tokens).toBeDefined();
    expect(typed.tokens?.accessToken).toBe("access");
    expect(typed.tokens?.refreshToken).toBe("refresh");
    expect(typed.tokens?.accountId).toBe("acc-legacy");
    expect(typed.last_refresh).toBe("2025-01-01T00:00:00.000Z");
  });

  it("reads current token format without modification", () => {
    const auth: AuthDotJson = {
      OPENAI_API_KEY: "sk-current",
      tokens: {
        idToken: {
          rawJwt: "raw",
          email: "user@example.com",
          chatgptPlanType: "plus",
          chatgptAccountId: "acc-123",
        },
        accessToken: "access-current",
        refreshToken: "refresh-current",
        accountId: "acc-123",
      },
      last_refresh: "2025-02-01T00:00:00.000Z",
    };
    writeAuthFile(auth);

    const loaded = loadAuthDotJsonSync();
    expect(loaded).not.toBeNull();
    expect(loaded?.OPENAI_API_KEY).toBe(auth.OPENAI_API_KEY);
    expect(loaded?.tokens?.accessToken).toBe(auth.tokens?.accessToken);
    expect(loaded?.tokens?.refreshToken).toBe(auth.tokens?.refreshToken);
    expect(loaded?.tokens?.accountId).toBe(auth.tokens?.accountId);
    expect(loaded?.tokens?.idToken.email).toBe(auth.tokens?.idToken.email);
    expect(loaded?.last_refresh).toBe(auth.last_refresh);
  });

  it("exposes ChatGPT auth debug info when tokens are present", () => {
    writeAuthFile({
      OPENAI_API_KEY: "sk-current",
      tokens: {
        id_token: "header.payload.sig",
        access_token: "access",
        refresh_token: "refresh",
        account_id: "acc-123",
      },
      last_refresh: "2025-02-01T00:00:00.000Z",
    });

    const info = getAuthDebugInfoSync();
    expect(info).not.toBeNull();
    expect(info?.mode).toBe("chatgpt");
    expect(info?.hasOpenaiApiKey).toBe(true);
  });

  it("exposes API-key-only debug info when only OPENAI_API_KEY is present", () => {
    writeAuthFile({
      OPENAI_API_KEY: "sk-only",
    });

    const info = getAuthDebugInfoSync();
    expect(info).not.toBeNull();
    expect(info?.mode).toBe("api-key");
    expect(info?.hasOpenaiApiKey).toBe(true);
  });
});
