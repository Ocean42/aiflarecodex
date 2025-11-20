import { describe, it, expect, vi } from "vitest";
import { ActiveSessionRegistry } from "../src/services/activeSessionRegistry.js";

describe("ActiveSessionRegistry", () => {
  it("notifies listeners when active session changes", () => {
    const registry = new ActiveSessionRegistry();
    const listener = vi.fn();
    registry.subscribe(listener);

    registry.setActiveSession("sess_a");
    registry.setActiveSession("sess_b");

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith({
      context: "global",
      sessionId: "sess_b",
    });
  });

  it("tracks multiple contexts independently", () => {
    const registry = new ActiveSessionRegistry();
    registry.setActiveSession("sess_cli_a", "cli_a");
    registry.setActiveSession("sess_cli_b", "cli_b");

    expect(registry.getActiveSession("cli_a")).toBe("sess_cli_a");
    expect(registry.getActiveSession("cli_b")).toBe("sess_cli_b");
    expect(registry.listContexts()).toEqual(
      expect.arrayContaining([
        { context: "cli_a", sessionId: "sess_cli_a" },
        { context: "cli_b", sessionId: "sess_cli_b" },
      ]),
    );
  });
});
