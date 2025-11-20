// @ts-nocheck
import { loadAuthDotJsonSync } from "./authModel.js";
import { getAuthFilePath } from "../utils/codexHome.js";
/**
 * Canonical representation of the Codex/ChatGPT credentials used by both the CLI
 * runtime and all tests. Every consumer must call {@link BackendCredentials.ensure}
 * so that we always derive tokens, headers, and base URLs through the same path
 * that `codex --login` configures.
 */
export class BackendCredentials {
    snapshot;
    constructor(snapshot) {
        this.snapshot = snapshot;
    }
    static ensure() {
        const authFile = getAuthFilePath();
        const auth = loadAuthDotJsonSync();
        if (!auth || !auth.tokens) {
            throw new Error(`No Codex/ChatGPT credentials found. Run 'codex --login' to create ${authFile}.`);
        }
        const { tokens } = auth;
        if (!tokens.accessToken ||
            tokens.accessToken.trim() === "" ||
            !tokens.idToken ||
            !tokens.idToken.rawJwt ||
            tokens.idToken.rawJwt.trim() === "") {
            throw new Error(`Auth file ${authFile} does not contain a valid ChatGPT session. Run 'codex --login' again.`);
        }
        const chatgptBaseUrl = BackendCredentials.normaliseChatgptBaseUrl(process.env["CHATGPT_BASE_URL"]);
        const codexBaseUrl = BackendCredentials.normaliseCodexBaseUrl(chatgptBaseUrl);
        const chatgptAccountId = tokens.accountId ?? tokens.idToken.chatgptAccountId ?? undefined;
        const creds = new BackendCredentials({
            chatgptBaseUrl,
            codexBaseUrl,
            accessToken: tokens.accessToken,
            chatgptAccountId,
        });
        creds.applyToProcessEnv();
        return creds;
    }
    static normaliseChatgptBaseUrl(override) {
        const fromEnv = override?.trim();
        const base = fromEnv && fromEnv.length > 0
            ? fromEnv
            : "https://chatgpt.com/backend-api";
        return base.replace(/\/+$/, "");
    }
    static normaliseCodexBaseUrl(chatgptBaseUrl) {
        const trimmed = chatgptBaseUrl.replace(/\/+$/, "");
        if (trimmed.endsWith("/codex")) {
            return trimmed;
        }
        return `${trimmed}/codex`;
    }
    applyToProcessEnv() {
        process.env["OPENAI_API_KEY"] = this.snapshot.accessToken;
        if (this.snapshot.chatgptAccountId) {
            process.env["CHATGPT_ACCOUNT_ID"] = this.snapshot.chatgptAccountId;
        }
        process.env["CHATGPT_BASE_URL"] = this.snapshot.chatgptBaseUrl;
    }
    get chatgptBaseUrl() {
        return this.snapshot.chatgptBaseUrl;
    }
    get codexBaseUrl() {
        return this.snapshot.codexBaseUrl;
    }
    get accessToken() {
        return this.snapshot.accessToken;
    }
    get chatgptAccountId() {
        return this.snapshot.chatgptAccountId;
    }
    toBackendClientOptions() {
        return {
            baseUrl: this.chatgptBaseUrl,
            bearerToken: this.accessToken,
            chatGptAccountId: this.chatgptAccountId,
        };
    }
}
