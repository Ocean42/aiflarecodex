import { loadAuthDotJsonSync } from "./authModel.js";
import { getAuthFilePath } from "../utils/codexHome.js";

export interface BackendCredentialSnapshot {
  chatgptBaseUrl: string;
  codexBaseUrl: string;
  accessToken: string;
  chatgptAccountId?: string;
}

/**
 * Canonical representation of the Codex/ChatGPT credentials used by both the CLI
 * runtime and all tests. Every consumer must call {@link BackendCredentials.ensure}
 * so that we always derive tokens, headers, and base URLs through the same path
 * that `codex --login` configures.
 */
export class BackendCredentials {
  private constructor(private readonly snapshot: BackendCredentialSnapshot) {}

  static ensure(): BackendCredentials {
    const authFile = getAuthFilePath();
    const auth = loadAuthDotJsonSync();
    if (!auth || !auth.tokens) {
      throw new Error(
        `No Codex/ChatGPT credentials found. Run 'codex --login' to create ${authFile}.`,
      );
    }

    const { tokens } = auth;
    if (
      !tokens.accessToken ||
      tokens.accessToken.trim() === "" ||
      !tokens.idToken ||
      !tokens.idToken.rawJwt ||
      tokens.idToken.rawJwt.trim() === ""
    ) {
      throw new Error(
        `Auth file ${authFile} does not contain a valid ChatGPT session. Run 'codex --login' again.`,
      );
    }

    const chatgptBaseUrl = BackendCredentials.normaliseChatgptBaseUrl(
      process.env["CHATGPT_BASE_URL"],
    );
    const codexBaseUrl =
      BackendCredentials.normaliseCodexBaseUrl(chatgptBaseUrl);
    const chatgptAccountId =
      tokens.accountId ?? tokens.idToken.chatgptAccountId ?? undefined;

    const creds = new BackendCredentials({
      chatgptBaseUrl,
      codexBaseUrl,
      accessToken: tokens.accessToken,
      chatgptAccountId,
    });
    creds.applyToProcessEnv();
    return creds;
  }

  private static normaliseChatgptBaseUrl(
    override?: string,
  ): string {
    const fromEnv = override?.trim();
    const base =
      fromEnv && fromEnv.length > 0
        ? fromEnv
        : "https://chatgpt.com/backend-api";
    return base.replace(/\/+$/, "");
  }

  private static normaliseCodexBaseUrl(chatgptBaseUrl: string): string {
    const trimmed = chatgptBaseUrl.replace(/\/+$/, "");
    if (trimmed.endsWith("/codex")) {
      return trimmed;
    }
    return `${trimmed}/codex`;
  }

  private applyToProcessEnv(): void {
    process.env["OPENAI_API_KEY"] = this.snapshot.accessToken;
    if (this.snapshot.chatgptAccountId) {
      process.env["CHATGPT_ACCOUNT_ID"] = this.snapshot.chatgptAccountId;
    }
    process.env["CHATGPT_BASE_URL"] = this.snapshot.chatgptBaseUrl;
  }

  get chatgptBaseUrl(): string {
    return this.snapshot.chatgptBaseUrl;
  }

  get codexBaseUrl(): string {
    return this.snapshot.codexBaseUrl;
  }

  get accessToken(): string {
    return this.snapshot.accessToken;
  }

  get chatgptAccountId(): string | undefined {
    return this.snapshot.chatgptAccountId;
  }

  toBackendClientOptions(): {
    baseUrl: string;
    bearerToken: string;
    chatGptAccountId?: string;
  } {
    return {
      baseUrl: this.chatgptBaseUrl,
      bearerToken: this.accessToken,
      chatGptAccountId: this.chatgptAccountId,
    };
  }
}
