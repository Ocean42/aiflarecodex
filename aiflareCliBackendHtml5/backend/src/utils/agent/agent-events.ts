// @ts-nocheck
export function isAgentGeneratedEvent(item) {
    return Boolean(item.agentEvent);
}
export function isNativeResponseItem(item) {
    return !isAgentGeneratedEvent(item);
}
