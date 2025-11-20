// @ts-nocheck
export class ToolRouter {
    handlers = new Map();
    register(name, handler) {
        this.handlers.set(name, handler);
    }
    async dispatch(invocation, ctx) {
        const handler = this.handlers.get(invocation.name);
        if (!handler) {
            throw new Error(`Tool '${invocation.name}' is not registered.`);
        }
        return handler(invocation, ctx);
    }
}
