// @ts-nocheck
import { getChatgptBaseUrl } from "./auth.js";
import { loadAuthDotJson } from "./authModel.js";
export async function getBackendAuth() {
    const auth = await loadAuthDotJson();
    if (!auth?.tokens) {
        return null;
    }
    const baseUrl = getChatgptBaseUrl();
    const { accessToken, accountId } = auth.tokens;
    if (!accessToken || accessToken.trim() === "") {
        return null;
    }
    return {
        baseUrl,
        accessToken,
        accountId,
    };
}
export async function getOpenaiApiKey() {
    const auth = await loadAuthDotJson();
    const key = auth?.OPENAI_API_KEY;
    if (key && key.trim() !== "") {
        return key.trim();
    }
    return null;
}
