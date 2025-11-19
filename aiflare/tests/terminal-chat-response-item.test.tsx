import { renderTui } from "./ui-test-helpers.js";
import TerminalChatResponseItem from "../src/components/chat/terminal-chat-response-item.js";
import React from "react";
import { describe, it, expect } from "vitest";

// Component under test

// The ResponseItem type is complex and imported from the OpenAI SDK. To keep
// this test lightweight we construct the minimal runtime objects we need and
// cast them to `any` so that TypeScript is satisfied.

function userMessage(text: string) {
  return {
    type: "message",
    role: "user",
    content: [
      {
        type: "input_text",
        text,
      },
    ],
  } as any;
}

function assistantMessage(text: string) {
  return {
    type: "message",
    role: "assistant",
    content: [
      {
        type: "output_text",
        text,
      },
    ],
  } as any;
}

describe("TerminalChatResponseItem", () => {
  it("renders a user message", () => {
    const { lastFrameStripped } = renderTui(
      <TerminalChatResponseItem
        item={userMessage("Hello world")}
        fileOpener={undefined}
      />,
    );

    const frame = lastFrameStripped();
    expect(frame).toContain("user");
    expect(frame).toContain("Hello world");
  });

  it("renders an assistant message", () => {
    const { lastFrameStripped } = renderTui(
      <TerminalChatResponseItem
        item={assistantMessage("Sure thing")}
        fileOpener={undefined}
      />,
    );

    const frame = lastFrameStripped();
    // assistant messages are labelled "codex" in the UI
    expect(frame.toLowerCase()).toContain("codex");
    expect(frame).toContain("Sure thing");
  });

  it("renders plan update events", () => {
    const { lastFrameStripped } = renderTui(
      <TerminalChatResponseItem
        item={
          {
            agentEvent: true,
            type: "plan_update",
            id: "plan-1",
            payload: {
              explanation: "Do the thing",
              plan: [
                { step: "Inspect repo", status: "in_progress" },
                { step: "Add tests", status: "pending" },
              ],
            },
          } as any
        }
        fileOpener={undefined}
      />,
    );

    const frame = lastFrameStripped();
    expect(frame).toContain("Plan Update");
    expect(frame).toContain("Do the thing");
    expect(frame).toContain("Inspect repo");
  });

  it("renders exec lifecycle events", () => {
    const { lastFrameStripped } = renderTui(
      <TerminalChatResponseItem
        item={
          {
            agentEvent: true,
            type: "exec_event",
            id: "exec-1",
            phase: "end",
            command: ["echo", "hi"],
            exitCode: 0,
            durationSeconds: 1.2,
            cwd: "/tmp",
          } as any
        }
        fileOpener={undefined}
      />,
    );

    const frame = lastFrameStripped();
    expect(frame).toContain("Command finished");
    expect(frame).toContain("echo hi");
    expect(frame).toContain("exit: 0");
  });

  it("renders reasoning summary deltas on a single line", () => {
    const { lastFrameStripped } = renderTui(
      <TerminalChatResponseItem
        item={
          {
            agentEvent: true,
            type: "reasoning_summary_delta",
            id: "reasoning-summary-0",
            summaryIndex: 0,
            delta: "Preparing to inspect repository",
          } as any
        }
        fileOpener={undefined}
      />,
    );

    const frame = lastFrameStripped();
    const lines = frame
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("Thinking: Preparing to inspect repository");
  });
});
