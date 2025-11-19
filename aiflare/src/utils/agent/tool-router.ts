import type { ResponseInputItem } from "openai/resources/responses/responses.mjs";

export type ToolInvocationType = "function_call" | "local_shell_call";

export type ToolInvocation = {
  /** `function_call` or `local_shell_call` */
  type: ToolInvocationType;
  /** Tool name reported by OpenAI (e.g. shell, apply_patch, update_plan). */
  name: string;
  /** Parsed arguments payload. */
  args: Record<string, unknown>;
  /** Raw JSON string passed over the wire (useful for diagnostics). */
  rawArguments?: string;
  /** Stable identifier provided by OpenAI (call_id or id). */
  callId?: string;
};

export type ToolOutput = ResponseInputItem;

export type ToolHandlerContext = {
  /** True when the agent loop has been cancelled. Handlers should bail quickly. */
  canceled: boolean;
};

export type ToolHandler = (
  invocation: ToolInvocation,
  ctx: ToolHandlerContext,
) => Promise<Array<ToolOutput>>;

export class ToolRouter {
  private readonly handlers = new Map<string, ToolHandler>();

  register(name: string, handler: ToolHandler): void {
    this.handlers.set(name, handler);
  }

  async dispatch(
    invocation: ToolInvocation,
    ctx: ToolHandlerContext,
  ): Promise<Array<ToolOutput>> {
    const handler = this.handlers.get(invocation.name);
    if (!handler) {
      throw new Error(`Tool '${invocation.name}' is not registered.`);
    }
    return handler(invocation, ctx);
  }
}
