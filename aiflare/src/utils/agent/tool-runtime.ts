import type { ResponseInputItem } from "openai/resources/responses/responses.mjs";
import type { ToolHandlerContext, ToolInvocation } from "./tool-router.js";
import type {
  ToolCallOutputEvent,
  ToolCallStartedEvent,
} from "./agent-events.js";

import { randomUUID } from "node:crypto";
import { ToolRouter } from "./tool-router.js";

type ToolRuntimeEvent = ToolCallStartedEvent | ToolCallOutputEvent;

type ToolRuntimeOptions = {
  router: ToolRouter;
  emit: (event: ToolRuntimeEvent) => void;
};

export class ToolRuntime {
  private router: ToolRouter;
  private emit: (event: ToolRuntimeEvent) => void;

  constructor({ router, emit }: ToolRuntimeOptions) {
    this.router = router;
    this.emit = emit;
  }

  async dispatch(
    invocation: ToolInvocation,
    ctx: ToolHandlerContext,
  ): Promise<Array<ResponseInputItem>> {
    const callId = invocation.callId ?? randomUUID();
    const normalizedInvocation: ToolInvocation = {
      ...invocation,
      callId,
    };
    const startedAt = Date.now();
    this.emit({
      agentEvent: true,
      type: "tool_call_started",
      id: `tool-start-${callId}-${startedAt}`,
      callId,
      toolName: normalizedInvocation.name,
    });
    try {
      const outputs = await this.router.dispatch(normalizedInvocation, ctx);
      this.emit({
        agentEvent: true,
        type: "tool_call_output",
        id: `tool-output-${callId}-${Date.now()}`,
        callId,
        toolName: normalizedInvocation.name,
        status: "ok",
        durationSeconds: this.durationSince(startedAt),
        outputCount: outputs.length,
      });
      return outputs;
    } catch (error) {
      this.emit({
        agentEvent: true,
        type: "tool_call_output",
        id: `tool-output-${callId}-${Date.now()}`,
        callId,
        toolName: normalizedInvocation.name,
        status: "error",
        durationSeconds: this.durationSince(startedAt),
        error:
          error instanceof Error
            ? error.message
            : `Tool failed: ${String(error)}`,
      });
      throw error;
    }
  }

  private durationSince(startedAt: number): number {
    const diff = Date.now() - startedAt;
    return Math.round(diff / 100) / 10;
  }
}
