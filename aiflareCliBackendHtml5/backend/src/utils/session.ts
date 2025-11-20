// @ts-nocheck
export const ORIGIN = "codex_cli_ts";
let sessionId = "";
/**
 * Update the globally tracked session identifier.
 * Passing an empty string clears the current session.
 */
export function setSessionId(id) {
    sessionId = id;
}
/**
 * Retrieve the currently active session identifier, or an empty string when
 * no session is active.
 */
export function getSessionId() {
    return sessionId;
}
let currentModel = "";
/**
 * Record the model that is currently being used for the conversation.
 * Setting an empty string clears the record so the next agent run can update it.
 */
export function setCurrentModel(model) {
    currentModel = model;
}
/**
 * Return the model that was last supplied to {@link setCurrentModel}.
 * If no model has been recorded yet, an empty string is returned.
 */
export function getCurrentModel() {
    return currentModel;
}
