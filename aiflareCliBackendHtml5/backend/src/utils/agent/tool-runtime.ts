// @ts-nocheck
import { randomUUID } from "node:crypto";
export class ToolRuntime {
    router;
    emit;
    constructor({ router, emit }) {
        this.router = router;
        this.emit = emit;
    }
    async dispatch(invocation, ctx) {
        const callId = invocation.callId ?? randomUUID();
        const normalizedInvocation = {
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
        }
        catch (error) {
            this.emit({
                agentEvent: true,
                type: "tool_call_output",
                id: `tool-output-${callId}-${Date.now()}`,
                callId,
                toolName: normalizedInvocation.name,
                status: "error",
                durationSeconds: this.durationSince(startedAt),
                error: error instanceof Error
                    ? error.message
                    : `Tool failed: ${String(error)}`,
            });
            throw error;
        }
    }
    durationSince(startedAt) {
        const diff = Date.now() - startedAt;
        return Math.round(diff / 100) / 10;
    }
}
