import fs from "fs/promises";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { getAuthFilePath, getCodexHomeDir } from "../utils/codexHome.js";

export interface IdTokenInfo {
  email?: string;
  chatgptPlanType?: string;
  chatgptAccountId?: string;
  organizationId?: string;
  projectId?: string;
  rawJwt: string;
}

export interface TokenData {
  idToken: IdTokenInfo;
  accessToken: string;
  refreshToken: string;
  accountId?: string;
}

export interface AuthDotJson {
  OPENAI_API_KEY?: string;
  tokens?: TokenData;
  last_refresh?: string;
}

export type AuthModeDebug = "chatgpt" | "api-key";

export interface AuthDebugInfo {
  mode: AuthModeDebug;
  hasOpenaiApiKey: boolean;
  email?: string;
  chatgptPlanType?: string;
  chatgptAccountId?: string;
}

export function parseIdToken(idToken: string): IdTokenInfo {
  const parts = idToken.split(".");
  if (parts.length < 2) {
    return { rawJwt: idToken };
  }

  try {
    const payloadJson = Buffer.from(parts[1]!, "base64url").toString("utf8");
    const payload = JSON.parse(payloadJson) as {
      email?: unknown;
      "https://api.openai.com/auth"?: {
        chatgpt_plan_type?: unknown;
        chatgpt_account_id?: unknown;
        organization_id?: unknown;
        project_id?: unknown;
      };
    };

    const email =
      typeof payload.email === "string" && payload.email.trim() !== ""
        ? payload.email
        : undefined;

    const authClaims = payload["https://api.openai.com/auth"];
    const chatgptPlanType =
      authClaims &&
      typeof authClaims.chatgpt_plan_type === "string" &&
      authClaims.chatgpt_plan_type.trim() !== ""
        ? authClaims.chatgpt_plan_type
        : undefined;
    const chatgptAccountId =
      authClaims &&
      typeof authClaims.chatgpt_account_id === "string" &&
      authClaims.chatgpt_account_id.trim() !== ""
        ? authClaims.chatgpt_account_id
        : undefined;
    const organizationId =
      authClaims &&
      typeof authClaims.organization_id === "string" &&
      authClaims.organization_id.trim() !== ""
        ? authClaims.organization_id
        : undefined;
    const projectId =
      authClaims &&
      typeof authClaims.project_id === "string" &&
      authClaims.project_id.trim() !== ""
        ? authClaims.project_id
        : undefined;

    return {
      email,
      chatgptPlanType,
      chatgptAccountId,
      organizationId,
      projectId,
      rawJwt: idToken,
    };
  } catch {
    return { rawJwt: idToken };
  }
}

function normaliseTokenData(rawTokens: unknown): TokenData | undefined {
  if (!rawTokens || typeof rawTokens !== "object") {
    return undefined;
  }

  const legacy = rawTokens as {
    id_token?: unknown;
    access_token?: unknown;
    refresh_token?: unknown;
    account_id?: unknown;
  };

  const current = rawTokens as {
    idToken?: unknown;
    accessToken?: unknown;
    refreshToken?: unknown;
    accountId?: unknown;
  };

  if (
    current.idToken &&
    typeof current.accessToken === "string" &&
    typeof current.refreshToken === "string"
  ) {
    const idToken = current.idToken as {
      email?: string;
      chatgptPlanType?: string;
      chatgptAccountId?: string;
      organizationId?: string;
      projectId?: string;
      rawJwt?: string;
    };
    return {
      idToken: {
        email: idToken.email,
        chatgptPlanType: idToken.chatgptPlanType,
        chatgptAccountId: idToken.chatgptAccountId,
        organizationId: idToken.organizationId,
        projectId: idToken.projectId,
        rawJwt: idToken.rawJwt ?? "",
      },
      accessToken: current.accessToken,
      refreshToken: current.refreshToken,
      accountId:
        typeof current.accountId === "string" &&
        current.accountId.trim() !== ""
          ? current.accountId
          : undefined,
    };
  }

  if (
    typeof legacy.id_token === "string" &&
    typeof legacy.access_token === "string" &&
    typeof legacy.refresh_token === "string"
  ) {
    const idTokenInfo = parseIdToken(legacy.id_token);
    return {
      idToken: idTokenInfo,
      accessToken: legacy.access_token,
      refreshToken: legacy.refresh_token,
      accountId:
        typeof legacy.account_id === "string" &&
        legacy.account_id.trim() !== ""
          ? legacy.account_id
          : idTokenInfo.chatgptAccountId,
    };
  }

  return undefined;
}

export async function loadAuthDotJson(): Promise<AuthDotJson | null> {
  const authFile = getAuthFilePath();
  try {
    const contents = await fs.readFile(authFile, "utf8");
    const raw = JSON.parse(contents) as {
      OPENAI_API_KEY?: unknown;
      tokens?: unknown;
      last_refresh?: unknown;
    };
    const tokens = normaliseTokenData(raw.tokens);

    const auth: AuthDotJson = {
      OPENAI_API_KEY:
        typeof raw.OPENAI_API_KEY === "string"
          ? raw.OPENAI_API_KEY
          : undefined,
      tokens,
      last_refresh:
        typeof raw.last_refresh === "string" ? raw.last_refresh : undefined,
    };
    return auth;
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === "ENOENT" || e.code === "ENOTDIR") {
      return null;
    }
    throw err;
  }
}

export function loadAuthDotJsonSync(): AuthDotJson | null {
  const authFile = getAuthFilePath();
  if (!existsSync(authFile)) {
    return null;
  }

  try {
    const contents = readFileSync(authFile, "utf8");
    const raw = JSON.parse(contents) as {
      OPENAI_API_KEY?: unknown;
      tokens?: unknown;
      last_refresh?: unknown;
    };
    const tokens = normaliseTokenData(raw.tokens);

    const auth: AuthDotJson = {
      OPENAI_API_KEY:
        typeof raw.OPENAI_API_KEY === "string"
          ? raw.OPENAI_API_KEY
          : undefined,
      tokens,
      last_refresh:
        typeof raw.last_refresh === "string" ? raw.last_refresh : undefined,
    };
    return auth;
  } catch {
    return null;
  }
}

export function getAuthDebugInfoSync(): AuthDebugInfo | null {
  const auth = loadAuthDotJsonSync();
  if (!auth) {
    return null;
  }

  const hasApiKey =
    typeof auth.OPENAI_API_KEY === "string" &&
    auth.OPENAI_API_KEY.trim() !== "";

  if (auth.tokens) {
    const { idToken, accountId } = auth.tokens;
    return {
      mode: "chatgpt",
      hasOpenaiApiKey: hasApiKey,
      email: idToken.email,
      chatgptPlanType: idToken.chatgptPlanType,
      chatgptAccountId: accountId ?? idToken.chatgptAccountId,
    };
  }

  if (hasApiKey) {
    return {
      mode: "api-key",
      hasOpenaiApiKey: true,
    };
  }

  return null;
}

export function getProjectIdFromAuthSync(): string | null {
  const auth = loadAuthDotJsonSync();
  if (!auth?.tokens) {
    return null;
  }

  const projectId = auth.tokens.idToken.projectId;
  if (projectId && projectId.trim() !== "") {
    return projectId.trim();
  }
  return null;
}

export async function saveAuthDotJson(auth: AuthDotJson): Promise<void> {
  const authFile = getAuthFilePath();
  const authDir = path.dirname(authFile);
  try {
    if (!existsSync(authDir)) {
      mkdirSync(authDir, { recursive: true });
    }
  } catch {
    // Best‑effort – if we cannot ensure the directory exists we still attempt
    // the write and let the error bubble up to the caller.
  }

  const serialisable: {
    OPENAI_API_KEY?: string;
    tokens?: {
      id_token: string;
      access_token: string;
      refresh_token: string;
      account_id?: string;
    };
    last_refresh?: string;
  } = {};

  if (auth.OPENAI_API_KEY && auth.OPENAI_API_KEY.trim() !== "") {
    serialisable.OPENAI_API_KEY = auth.OPENAI_API_KEY.trim();
  }

  if (auth.tokens) {
    const { idToken, accessToken, refreshToken, accountId } = auth.tokens;
    serialisable.tokens = {
      id_token: idToken.rawJwt,
      access_token: accessToken,
      refresh_token: refreshToken,
      account_id: accountId,
    };
  }

  if (auth.last_refresh) {
    serialisable.last_refresh = auth.last_refresh;
  }

  const payload = JSON.stringify(serialisable, null, 2);
  await fs.writeFile(authFile, payload, { mode: 0o600 });
}
