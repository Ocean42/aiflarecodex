// @ts-nocheck
export class MapToolExecutor {
    handlers;
    constructor(handlers) {
        this.handlers = handlers;
    }
    supports(toolName) {
        return this.handlers.has(toolName);
    }
    async execute(invocation, ctx) {
        const handler = this.handlers.get(invocation.name);
        if (!handler) {
            throw new Error(`ToolExecutor has no handler for tool ${invocation.name}`);
        }
        return handler(invocation, ctx);
    }
}
export class TestToolExecutor {
    handlers = new Map();
    register(name, handler) {
        this.handlers.set(name, handler);
        return () => this.handlers.delete(name);
    }
    supports(toolName) {
        return this.handlers.has(toolName);
    }
    async execute(invocation, ctx) {
        const handler = this.handlers.get(invocation.name);
        if (!handler) {
            throw new Error(`TestToolExecutor missing handler for ${invocation.name}`);
        }
        return handler(invocation, ctx);
    }
}
