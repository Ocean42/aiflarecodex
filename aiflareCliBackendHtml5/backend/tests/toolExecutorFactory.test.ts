import { describe, it, expect } from "vitest";
import type { SessionSummary } from "@aiflare/protocol";
import { createToolExecutorFactory } from "../src/services/toolExecutorFactory.js";
import { ToolResultBroker } from "../src/services/toolResultBroker.js";

describe("CliToolExecutor", () => {
  it("enqueues agent_tool_call and resolves with broker output", async () => {
    const broker = new ToolResultBroker();
    const enqueued: Array<{ cliId: string; payload: unknown }> = [];
    const factory = createToolExecutorFactory({
      mode: "cli",
      enqueueAction: (cliId, payload) => enqueued.push({ cliId, payload }),
      toolResultBroker: broker,
    });
    const summary: SessionSummary = {
      id: "sess_test",
      cliId: "cli_test",
      model: "gpt-test",
      workdir: "/tmp",
      status: "waiting",
      lastUpdated: new Date().toISOString(),
      title: "Tool Session",
    };
    const executor = factory(summary);
    const executePromise = executor.execute(
      {
        name: "shell",
        args: { cmd: ["echo", "hi"] },
        callId: "call_fake",
        type: "function_call",
      },
      { canceled: false },
    );
    expect(enqueued).toHaveLength(1);
    const action = enqueued[0];
    expect(action.cliId).toBe("cli_test");
    expect(
      (action.payload as { sessionId?: string; type?: string }).sessionId,
    ).toBe("sess_test");
    expect((action.payload as { type?: string }).type).toBe("agent_tool_call");
    broker.resolve("call_fake", [
      { type: "function_call_output", call_id: "call_fake", output: "{}" },
    ]);
    const outputs = await executePromise;
    expect(outputs).toHaveLength(1);
    expect(outputs[0]).toMatchObject({
      call_id: "call_fake",
      type: "function_call_output",
    });
  });
});
