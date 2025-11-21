import { randomUUID } from "node:crypto";
import type { CliId, SessionSummary } from "@aiflare/protocol";
import {
  InMemoryToolExecutor,
  type ToolExecutor,
  type ToolInvocation,
  type ToolExecutionContext,
} from "./toolExecutor.js";
import { ToolResultBroker } from "./toolResultBroker.js";

export type ToolExecutorFactory = (
  summary: SessionSummary,
) => ToolExecutor;

export type ToolExecutorFactoryOptions =
  | {
      mode: "test";
    }
  | {
      mode: "cli";
      enqueueAction: (cliId: CliId, payload: unknown) => void;
      toolResultBroker: ToolResultBroker;
    };

export function createToolExecutorFactory(
  options: ToolExecutorFactoryOptions,
): ToolExecutorFactory {
  if (options.mode === "test") {
    const executor = new InMemoryToolExecutor();
    return () => executor;
  }
  return (summary) =>
    new CliToolExecutor(
      summary.cliId,
      summary.id,
      options.enqueueAction,
      options.toolResultBroker,
      summary.workdir,
    );
}

class CliToolExecutor implements ToolExecutor {
  constructor(
    private readonly cliId: CliId,
    private readonly sessionId: string,
    private readonly enqueueAction: (cliId: CliId, payload: unknown) => void,
    private readonly resultBroker: ToolResultBroker,
    private readonly workdir?: string,
  ) {}

  supports(): boolean {
    return true;
  }

  async execute(
    invocation: ToolInvocation,
    _ctx: ToolExecutionContext,
  ): Promise<Array<unknown>> {
    const callId = invocation.callId ?? randomUUID();
    const normalizedInvocation: ToolInvocation = {
      ...invocation,
      callId,
    };
    this.enqueueAction(this.cliId, {
      type: "agent_tool_call",
      cliId: this.cliId,
      sessionId: this.sessionId,
      invocation: normalizedInvocation,
      workdir: this.workdir,
    });
    return this.resultBroker.waitForResult(callId);
  }
}
