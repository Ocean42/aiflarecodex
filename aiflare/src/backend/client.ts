import type { RateLimitSnapshot, RateLimitStatusPayload } from "./rateLimitTypes.js";
import { rateLimitSnapshotFromPayload } from "./rateLimitTypes.js";
import { HttpClient } from "./httpClient.js";

export type PathStyle = "codexApi" | "chatGptApi";

export interface BackendClientOptions {
  baseUrl: string;
  /**
   * Optional bearer token for the Codex backend / ChatGPT backend.
   * This is *not* the OpenAI API key; in Rust wird hier z. B. ein
   * ChatGPT-OIDC-Token übergeben.
   */
  bearerToken?: string;
  /**
   * Optional User-Agent, z. B. ein Codex-spezifischer UA-String.
   */
  userAgent?: string;
  /**
   * Optional ChatGPT-Account-ID, die als `ChatGPT-Account-Id`-Header
   * mitgeschickt werden kann.
   */
  chatGptAccountId?: string;
}

/**
 * TypeScript-Port des Rust-Backend-Clients aus codex-rs/backend-client.
 *
 * Diese Klasse kennt nur HTTP-Endpoints des Codex-Backends (z. B.
 * `/api/codex/usage` oder `/wham/usage`) und kapselt deren Aufruf. Sie
 * spricht *nicht* direkt mit der OpenAI API; stattdessen erwartet sie,
 * dass `baseUrl` auf eine Codex- oder ChatGPT-Backend-Instanz zeigt.
 */
export class BackendClient {
  private readonly bearerToken?: string;
  private readonly userAgent?: string;
  private readonly chatGptAccountId?: string;
  private readonly pathStyle: PathStyle;
  private readonly http: HttpClient;

  constructor(options: BackendClientOptions) {
    let baseUrl = options.baseUrl;
    while (baseUrl.endsWith("/")) {
      baseUrl = baseUrl.slice(0, -1);
    }

    if (
      (baseUrl.startsWith("https://chatgpt.com") ||
        baseUrl.startsWith("https://chat.openai.com")) &&
      !baseUrl.includes("/backend-api")
    ) {
      baseUrl = `${baseUrl}/backend-api`;
    }

    this.bearerToken = options.bearerToken;
    this.userAgent = options.userAgent;
    this.chatGptAccountId = options.chatGptAccountId;
    this.pathStyle = baseUrl.includes("/backend-api") ? "chatGptApi" : "codexApi";
    this.http = new HttpClient({
      baseUrl,
      defaultHeaders: {
        "User-Agent": this.userAgent || "codex-cli-ts",
        ...(this.bearerToken ? { Authorization: `Bearer ${this.bearerToken}` } : {}),
        ...(this.chatGptAccountId
          ? { "ChatGPT-Account-Id": this.chatGptAccountId }
          : {}),
      },
    });
  }

  /**
   * Ruft die aktuellen Rate-Limits beim Codex-/ChatGPT-Backend ab und
   * konvertiert sie in ein `RateLimitSnapshot`, analog zum Rust-Client.
   *
   * - Für klassische Codex-Backends wird `/api/codex/usage` aufgerufen.
   * - Für ChatGPT-Backends (baseUrl mit `/backend-api`) wird `/wham/usage` genutzt.
   */
  async getRateLimits(): Promise<RateLimitSnapshot> {
    const path =
      this.pathStyle === "codexApi"
        ? "/api/codex/usage"
        : "/wham/usage";

    const payload = await this.http.getJson<RateLimitStatusPayload>(path);
    return rateLimitSnapshotFromPayload(payload);
  }
}

