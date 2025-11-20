export type ToolInvocation = {
  name: string;
  args?: unknown;
  callId?: string;
};

export type ToolExecutionContext = {
  canceled: boolean;
};

export interface ToolExecutor {
  supports(toolName: string): boolean;
  execute(
    invocation: ToolInvocation,
    ctx: ToolExecutionContext,
  ): Promise<Array<unknown>>;
}

type InMemoryHandler = (
  invocation: ToolInvocation,
  ctx: ToolExecutionContext,
) => Promise<Array<unknown>>;

export class InMemoryToolExecutor implements ToolExecutor {
  private readonly handlers = new Map<string, InMemoryHandler>();

  register(name: string, handler: InMemoryHandler): () => void {
    this.handlers.set(name, handler);
    return () => this.handlers.delete(name);
  }

  supports(toolName: string): boolean {
    return this.handlers.has(toolName);
  }

  async execute(
    invocation: ToolInvocation,
    ctx: ToolExecutionContext,
  ): Promise<Array<unknown>> {
    const handler = this.handlers.get(invocation.name);
    if (!handler) {
      throw new Error(
        `InMemoryToolExecutor missing handler for ${invocation.name}`,
      );
    }
    return handler(invocation, ctx);
  }
}
