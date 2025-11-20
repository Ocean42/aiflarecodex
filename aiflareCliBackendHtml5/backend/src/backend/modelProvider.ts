// @ts-nocheck
import { providers } from "../utils/providers.js";
const DEFAULT_REQUEST_MAX_RETRIES = 4;
const DEFAULT_STREAM_MAX_RETRIES = 5;
const DEFAULT_STREAM_IDLE_TIMEOUT_MS = 45_000;
function defaultWireApiForProvider(id) {
    const key = id.toLowerCase();
    if (key === "openai" || key === "azure") {
        return "responses";
    }
    return "chat-completions";
}
function requiresOpenaiAuth(id) {
    const key = id.toLowerCase();
    return key === "openai" || key === "azure";
}
export function getDefaultModelProviderInfo(providerId) {
    const key = providerId.toLowerCase();
    const base = providers[key];
    if (!base) {
        return null;
    }
    return {
        name: base.name,
        baseUrl: base.baseURL,
        envKey: base.envKey,
        wireApi: defaultWireApiForProvider(key),
        requestMaxRetries: DEFAULT_REQUEST_MAX_RETRIES,
        streamMaxRetries: DEFAULT_STREAM_MAX_RETRIES,
        streamIdleTimeoutMs: DEFAULT_STREAM_IDLE_TIMEOUT_MS,
        requiresOpenaiAuth: requiresOpenaiAuth(key),
    };
}
