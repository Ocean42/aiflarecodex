import { describe, it, expect, beforeEach } from "vitest";
import { AppState } from "../src/state/appState.js";

describe("appState selection", () => {
  let state: AppState;

  beforeEach(() => {
    // Create isolated instance per test
    state = new AppState();
  });

  it("opens sessions and exposes messages immediately", () => {
    const sessionId = "sess_test";
    state.updateSession({
      id: sessionId,
      cliId: "cli_a",
      model: "gpt-test",
      workdir: "/tmp",
      status: "waiting",
      lastUpdated: new Date().toISOString(),
    });
    state.setSessionMessages(sessionId, [
      { id: "msg1", sessionId, role: "assistant", content: "Hallo", timestamp: new Date().toISOString() },
    ]);
    let notified = false;
    state.subscribe(() => {
      notified = true;
    });

    state.openSession(sessionId);

    expect(notified).toBe(true);
    expect(state.sessionMessages.get(sessionId)).toHaveLength(1);
    expect(state.openSessionIds).toContain(sessionId);
  });
});
