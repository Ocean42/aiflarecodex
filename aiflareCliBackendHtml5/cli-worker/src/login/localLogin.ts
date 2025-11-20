import express from "express";
import open from "open";
import crypto from "node:crypto";
import type { Request, Response } from "express";

type OidcConfiguration = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
};

type IdTokenClaims = {
  email?: string;
  chatgptPlanType?: string;
  chatgptAccountId?: string;
  organizationId?: string;
  projectId?: string;
  rawJwt: string;
};

export type AuthUploadPayload = {
  OPENAI_API_KEY: string;
  tokens: {
    idToken: IdTokenClaims;
    accessToken: string;
    refreshToken: string;
    accountId?: string;
  };
  last_refresh: string;
};

const ISSUER = "https://auth.openai.com";
const CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";

const LOGIN_PORT = 1455;
const LOGIN_HOST = "localhost";

const LOGIN_SUCCESS_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Sign into Codex CLI</title>
    <link rel="icon" href='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 32 32"%3E%3Cpath stroke="%23000" stroke-linecap="round" stroke-width="2.484" d="M22.356 19.797H17.17M9.662 12.29l1.979 3.576a.511.511 0 0 1-.005.504l-1.974 3.409M30.758 16c0 8.15-6.607 14.758-14.758 14.758-8.15 0-14.758-6.607-14.758-14.758C1.242 7.85 7.85 1.242 16 1.242c8.15 0 14.758 6.608 14.758 14.758Z"/%3E%3C/svg%3E' type="image/svg+xml">
    <style>
      .container {
        margin: auto;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        background: white;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      }
      .inner-container {
        width: 400px;
        flex-direction: column;
        justify-content: flex-start;
        align-items: center;
        gap: 20px;
        display: inline-flex;
      }
      .content {
        align-self: stretch;
        flex-direction: column;
        justify-content: flex-start;
        align-items: center;
        gap: 20px;
        display: flex;
      }
      .svg-wrapper {
        position: relative;
      }
      .title {
        text-align: center;
        color: var(--text-primary, #0D0D0D);
        font-size: 28px;
        font-weight: 400;
        line-height: 36.40px;
        word-wrap: break-word;
      }
      .setup-box {
        width: 600px;
        padding: 16px 20px;
        background: var(--bg-primary, white);
        box-shadow: 0px 4px 16px rgba(0, 0, 0, 0.05);
        border-radius: 16px;
        outline: 1px var(--border-default, rgba(13, 13, 13, 0.10)) solid;
        outline-offset: -1px;
        justify-content: flex-start;
        align-items: center;
        gap: 16px;
        display: inline-flex;
      }
      .setup-content {
        flex: 1 1 0;
        justify-content: flex-start;
        align-items: center;
        gap: 24px;
        display: flex;
      }
      .setup-text {
        flex: 1 1 0;
        flex-direction: column;
        justify-content: flex-start;
        align-items: flex-start;
        gap: 4px;
        display: inline-flex;
      }
      .setup-title {
        align-self: stretch;
        color: var(--text-primary, #0D0D0D);
        font-size: 14px;
        font-weight: 510;
        line-height: 20px;
        word-wrap: break-word;
      }
      .setup-description {
        align-self: stretch;
        color: var(--text-secondary, #5D5D5D);
        font-size: 14px;
        font-weight: 400;
        line-height: 20px;
        word-wrap: break-word;
      }
      .redirect-box {
        justify-content: flex-start;
        align-items: center;
        gap: 8px;
        display: flex;
      }
      .close-button,
      .redirect-button {
        height: 28px;
        padding: 8px 16px;
        background: var(--interactive-bg-primary-default, #0D0D0D);
        border-radius: 999px;
        justify-content: center;
        align-items: center;
        gap: 4px;
        display: flex;
      }
      .close-button,
      .redirect-text {
        color: var(--interactive-label-primary-default, white);
        font-size: 14px;
        font-weight: 510;
        line-height: 20px;
        word-wrap: break-word;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="inner-container">
        <div class="content">
          <div data-svg-wrapper class="svg-wrapper">
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4.6665 28.0003C4.6665 15.1137 15.1132 4.66699 27.9998 4.66699C40.8865 4.66699 51.3332 15.1137 51.3332 28.0003C51.3332 40.887 40.8865 51.3337 27.9998 51.3337C15.1132 51.3337 4.6665 40.887 4.6665 28.0003ZM37.5093 18.5088C36.4554 17.7672 34.9999 18.0203 34.2583 19.0742L24.8508 32.4427L20.9764 28.1808C20.1095 27.2272 18.6338 27.1569 17.6803 28.0238C16.7267 28.8906 16.6565 30.3664 17.5233 31.3199L23.3566 37.7366C23.833 38.2606 24.5216 38.5399 25.2284 38.4958C25.9353 38.4517 26.5838 38.089 26.9914 37.5098L38.0747 21.7598C38.8163 20.7059 38.5632 19.2504 37.5093 18.5088Z" fill="var(--green-400, #04B84C)"/>
            </svg>
          </div>
          <div class="title">Signed in to Codex CLI</div>
        </div>
        <div class="close-box" style="display: none;">
          <div class="setup-description">You may now close this page</div>
        </div>
        <div class="setup-box" style="display: none;">
          <div class="setup-content">
            <div class="setup-text">
              <div class="setup-title">Finish setting up your API organization</div>
              <div class="setup-description">Add a payment method to use your organization.</div>
            </div>
            <div class="redirect-box">
              <div data-hasendicon="false" data-hasstarticon="false" data-ishovered="false" data-isinactive="false" data-ispressed="false" data-size="large" data-type="primary" class="redirect-button">
                <div class="redirect-text">Redirecting in 3s...</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <script>
      (function () {
        const params = new URLSearchParams(window.location.search);
        const needsSetup = params.get('needs_setup') === 'true';
        const platformUrl = params.get('platform_url') || 'https://platform.openai.com';
        const orgId = params.get('org_id');
        const projectId = params.get('project_id');
        const planType = params.get('plan_type');
        const idToken = params.get('id_token');
        if (needsSetup) {
          const setupBox = document.querySelector('.setup-box');
          setupBox.style.display = 'flex';
          const redirectUrlObj = new URL('/org-setup', platformUrl);
          redirectUrlObj.searchParams.set('p', planType || '');
          redirectUrlObj.searchParams.set('t', idToken || '');
          redirectUrlObj.searchParams.set('with_org', orgId || '');
          redirectUrlObj.searchParams.set('project_id', projectId || '');
          const redirectUrl = redirectUrlObj.toString();
          const message = document.querySelector('.redirect-text');
          let countdown = 3;
          function tick() {
            message.textContent =
              'Redirecting in ' + countdown + 's…';
            if (countdown === 0) {
              window.location.replace(redirectUrl);
            } else {
              countdown -= 1;
              setTimeout(tick, 1000);
            }
          }
          tick();
        } else {
          const closeBox = document.querySelector('.close-box');
          closeBox.style.display = 'flex';
        }
      })();
    </script>
  </body>
</html>`;

export async function runLocalCodexLogin(): Promise<AuthUploadPayload> {
  const { codeVerifier, codeChallenge } = generatePkceCodes();
  const state = crypto.randomUUID();
  const { server, redirectUri, completion } = await startLocalCallbackServer(
    state,
    codeVerifier,
  );
  try {
    const oidc = await fetchOidcConfiguration();
  oidc.authorization_endpoint = `${ISSUER}/oauth/authorize`;
  oidc.token_endpoint = `${ISSUER}/oauth/token`;
  const authUrl = new URL(oidc.authorization_endpoint);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "openid profile email offline_access");
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("id_token_add_organizations", "true");

    console.log("[cli-worker] Opening Codex login URL:", authUrl.toString());
    void open(authUrl.toString());

    const authData = await completion;
    return authData;
  } finally {
    server.close();
  }
}

async function fetchOidcConfiguration(): Promise<OidcConfiguration> {
  const discoveryUrl = new URL(ISSUER);
  discoveryUrl.pathname = "/.well-known/openid-configuration";
  if (ISSUER === "https://auth.openai.com") {
    discoveryUrl.pathname = "/v2.0" + discoveryUrl.pathname;
  }
  const res = await fetch(discoveryUrl.toString());
  if (!res.ok) {
    throw new Error(`Failed to fetch OIDC configuration (${res.status})`);
  }
  return (await res.json()) as OidcConfiguration;
}

function generatePkceCodes(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(64).toString("hex");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  return { codeVerifier, codeChallenge };
}

async function startLocalCallbackServer(
  state: string,
  codeVerifier: string,
): Promise<{
  server: ReturnType<typeof express["prototype"]["listen"]>;
  redirectUri: string;
  completion: Promise<AuthUploadPayload>;
}> {
  const app = express();
  let resolveAuth!: (value: AuthUploadPayload) => void;
  let rejectAuth!: (reason?: unknown) => void;
  let pendingAuthData: AuthUploadPayload | null = null;

  const completion = new Promise<AuthUploadPayload>((resolve, reject) => {
    resolveAuth = resolve;
    rejectAuth = reject;
  });

  app.get("/success", (_req: Request, res: Response) => {
    res.type("text/html").send(LOGIN_SUCCESS_HTML);
    if (pendingAuthData) {
      resolveAuth(pendingAuthData);
      pendingAuthData = null;
    }
  });

  app.locals.state = state;
  app.locals.codeVerifier = codeVerifier;

  app.get("/auth/callback", async (req: Request, res: Response) => {
    try {
      const { authData, successUrl } = await exchangeTokens(req, redirectUri);
      pendingAuthData = authData;
      res.redirect(successUrl);
    } catch (error) {
      rejectAuth(error);
      res.status(500).send("Failed to complete Codex login.");
    }
  });

  const server = await new Promise<ReturnType<typeof express["prototype"]["listen"]>>(
    (resolve, reject) => {
      const instance = app.listen(LOGIN_PORT, () => resolve(instance));
      instance.on("error", (error) => reject(error));
    },
  );
  const redirectUri = `http://localhost:${LOGIN_PORT}/auth/callback`;

  return { server, redirectUri, completion };
}

async function exchangeTokens(
  req: Request,
  redirectUri: string,
): Promise<{ authData: AuthUploadPayload; successUrl: string }> {
  const oidc = await fetchOidcConfiguration();
  oidc.token_endpoint = `${ISSUER}/oauth/token`;
  const state = (req.query["state"] as string | undefined) ?? "";
  const code = (req.query["code"] as string | undefined) ?? "";
  if (!state || !code) {
    throw new Error("Missing state or code");
  }
  const locals = req.app.locals as { state?: string; codeVerifier?: string };
  const codeVerifier = locals.codeVerifier ?? "";
  const expectedState = locals.state ?? "";
  if (!codeVerifier || !expectedState || expectedState !== state) {
    throw new Error("Invalid login state");
  }
  const params = new URLSearchParams();
  params.append("grant_type", "authorization_code");
  params.append("code", code);
  params.append("redirect_uri", redirectUri);
  params.append("client_id", CLIENT_ID);
  params.append("code_verifier", codeVerifier);
  oidc.token_endpoint = `${ISSUER}/oauth/token`;
  const tokenRes = await fetch(oidc.token_endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  if (!tokenRes.ok) {
    throw new Error("Failed to exchange authorization code for tokens");
  }
  const tokenData = (await tokenRes.json()) as {
    id_token: string;
    access_token: string;
    refresh_token: string;
  };
  const idTokenParts = tokenData.id_token.split(".");
  if (idTokenParts.length !== 3) {
    throw new Error("Invalid ID token");
  }
  const rawClaims = JSON.parse(
    Buffer.from(idTokenParts[1]!, "base64url").toString("utf8"),
  ) as {
    "https://api.openai.com/auth"?: {
      organization_id?: string;
      project_id?: string;
      completed_platform_onboarding?: boolean;
      is_org_owner?: boolean;
      chatgpt_plan_type?: string;
    };
  };
  const apiKey = await exchangeForApiKey(oidc.token_endpoint, tokenData.id_token);
  const idTokenInfo = parseIdToken(tokenData.id_token);
  const successUrl = buildSuccessUrl(
    redirectUri,
    tokenData.id_token,
    idTokenInfo,
    rawClaims,
  );
  return {
    authData: {
      OPENAI_API_KEY: apiKey,
      tokens: {
        idToken: idTokenInfo,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        accountId: idTokenInfo.chatgptAccountId,
      },
      last_refresh: new Date().toISOString(),
    },
    successUrl,
  };
}

async function exchangeForApiKey(
  tokenEndpoint: string,
  idToken: string,
): Promise<string> {
  const request = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
    client_id: CLIENT_ID,
    requested_token: "openai-api-key",
    subject_token: idToken,
    subject_token_type: "urn:ietf:params:oauth:token-type:id_token",
    name: `Codex CLI (auto) ${new Date().toISOString()}`,
  });
  const res = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: request.toString(),
  });
  if (!res.ok) {
    throw new Error(`Failed to create API key (${res.status})`);
  }
  const payload = (await res.json()) as { access_token: string };
  return payload.access_token;
}

function parseIdToken(idToken: string): IdTokenClaims {
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
    const claims = payload["https://api.openai.com/auth"] ?? {};
    return {
      email:
        typeof payload.email === "string" && payload.email.trim().length > 0
          ? payload.email
          : undefined,
      chatgptPlanType:
        typeof claims.chatgpt_plan_type === "string" &&
        claims.chatgpt_plan_type.trim().length > 0
          ? claims.chatgpt_plan_type
          : undefined,
      chatgptAccountId:
        typeof claims.chatgpt_account_id === "string" &&
        claims.chatgpt_account_id.trim().length > 0
          ? claims.chatgpt_account_id
          : undefined,
      organizationId:
        typeof claims.organization_id === "string" &&
        claims.organization_id.trim().length > 0
          ? claims.organization_id
          : undefined,
      projectId:
        typeof claims.project_id === "string" &&
        claims.project_id.trim().length > 0
          ? claims.project_id
          : undefined,
      rawJwt: idToken,
    };
  } catch {
    return { rawJwt: idToken };
  }
}

function buildSuccessUrl(
  redirectUri: string,
  idToken: string,
  idInfo: IdTokenClaims,
  rawClaims: {
    "https://api.openai.com/auth"?: {
      organization_id?: string;
      project_id?: string;
      completed_platform_onboarding?: boolean;
      is_org_owner?: boolean;
      chatgpt_plan_type?: string;
    };
  },
): string {
  const authClaims = rawClaims["https://api.openai.com/auth"] ?? {};
  const completed = Boolean(authClaims.completed_platform_onboarding);
  const isOwner = Boolean(authClaims.is_org_owner);
  const needsSetup = !completed && isOwner;
  const base = new URL("/success", redirectUri);
  if (ISSUER === "https://auth.openai.com") {
    base.searchParams.set("platform_url", "https://platform.openai.com");
  } else {
    base.searchParams.set("platform_url", "https://platform.api.openai.org");
  }
  base.searchParams.set("id_token", idToken);
  base.searchParams.set("needs_setup", needsSetup ? "true" : "false");
  if (idInfo.organizationId) {
    base.searchParams.set("org_id", idInfo.organizationId);
  }
  if (idInfo.projectId) {
    base.searchParams.set("project_id", idInfo.projectId);
  }
  if (idInfo.chatgptPlanType) {
    base.searchParams.set("plan_type", idInfo.chatgptPlanType);
  }
  return base.toString();
}
