import React from "react";
import type { ComponentProps } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import TerminalChatInput from "../src/components/chat/terminal-chat-input.js";
import { renderTui } from "./ui-test-helpers.js";

// Ensure we don't accidentally touch the real filesystem when resolving auth.json.
vi.mock("../src/utils/codexHome.js", () => ({
  getCodexHomeDir: () => "/tmp",
  getAuthFilePath: () => "/tmp/aiflare-codey-test-auth.json",
  getSessionsRoot: () => "/tmp",
  getHistoryFilePath: () => "/tmp/aiflare-codey-history.json",
}));

describe.skip("TerminalChatInput /logout slash command", () => {
  const setItems = vi.fn();
  const onLogout = vi.fn();

  beforeEach(() => {
    setItems.mockReset();
    onLogout.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("triggers onLogout when /logout is submitted", async () => {
    const submitInput = vi.fn();

    const props: ComponentProps<typeof TerminalChatInput> = {
      isNew: false,
      loading: false,
      submitInput,
      confirmationPrompt: null,
      explanation: undefined,
      submitConfirmation: () => {},
      setLastResponseId: () => {},
      setItems,
      contextLeftPercent: 50,
      openOverlay: () => {},
      openDiffOverlay: () => {},
      openModelOverlay: () => {},
      openApprovalOverlay: () => {},
      openHelpOverlay: () => {},
      openSessionsOverlay: () => {},
      onCompact: () => {},
      onStatus: () => {},
      onLogout,
      interruptAgent: () => {},
      active: true,
      thinkingSeconds: 0,
      items: [],
    };

    const { stdin, flush, cleanup } = renderTui(
      <TerminalChatInput {...props} />,
    );

    // Type "/logout" and press Enter.
    stdin.write("/logout");
    await flush();
    stdin.write("\r");
    await flush();

    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(submitInput).not.toHaveBeenCalled();

    cleanup();
  });
});
