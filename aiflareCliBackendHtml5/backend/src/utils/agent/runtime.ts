// @ts-nocheck
import { ReviewDecision } from "./review.js";
import { isNativeResponseItem } from "./agent-events.js";
import { AgentLoop } from "./agent-loop.js";
import { loadConfig } from "../config.js";
import { AutoApprovalMode } from "../auto-approval-mode.js";
import { existsSync } from "node:fs";
class AgentLoopRuntime {
    sessionId;
    summary;
    agent;
    lastResponseId = "";
    lastAssistantMessage = "";
    workdir;
    onAgentItem;
    constructor(sessionId, options) {
        this.sessionId = sessionId;
        const summary = options.getSessionSummary(sessionId);
        if (!summary) {
            throw new Error(`Session ${sessionId} not found`);
        }
        this.summary = summary;
        const resolvedWorkdir = summary.workdir && existsSync(summary.workdir)
            ? summary.workdir
            : process.cwd();
        this.workdir = resolvedWorkdir;
        const config = loadConfig(undefined, undefined, {
            cwd: this.workdir,
        });
        this.onAgentItem = options.onAgentItem;
        this.agent = new AgentLoop({
            model: summary.model || config.model,
            provider: config.provider,
            instructions: config.instructions,
            approvalPolicy: resolveApprovalPolicy(config.approvalMode),
            sessionId,
            disableResponseStorage: config.disableResponseStorage,
            additionalWritableRoots: [this.workdir],
            config,
            onItem: (item) => this.handleAgentItem(item),
            onLoading: () => {
                // no-op for backend runtime (UI handles status)
            },
            getCommandConfirmation: async () => ({
                review: ReviewDecision.YES,
            }),
            onLastResponseId: (id) => {
                this.lastResponseId = id;
            },
            toolExecutor: options.createToolExecutor?.(summary),
        });
    }
    async runPrompt(prompt) {
        const message = createUserMessage(prompt);
        this.lastAssistantMessage = "";
        const previousCwd = process.cwd();
        try {
            process.chdir(this.workdir);
            console.log(`[agent-loop] session=${this.sessionId} prompt=${JSON.stringify(message)}`);
            await this.agent.run([message], this.lastResponseId);
        }
        finally {
            process.chdir(previousCwd);
        }
        console.log(`[agent-loop] session=${this.sessionId} reply=${JSON.stringify(this.lastAssistantMessage)}`);
        if (!this.lastAssistantMessage) {
            throw new Error("empty_agent_response");
        }
        return this.lastAssistantMessage;
    }
    dispose() {
        this.agent.terminate();
    }
    handleAgentItem(item) {
        try {
            console.log(`[agent-loop] session=${this.sessionId} item-raw=${JSON.stringify(item)}`);
        }
        catch {
            // ignore logging errors
        }
        if (!isNativeResponseItem(item)) {
            return;
        }
        if (item.type === "message" && item.role === "assistant") {
            const text = extractAssistantText(item);
            if (text.trim().length > 0) {
                this.lastAssistantMessage = text.trim();
            }
            this.onAgentItem?.(this.sessionId, item);
        }
    }
}
function extractAssistantText(item) {
    const message = item;
    const segments = message.content ?? [];
    const text = segments
        .map((segment) => "text" in segment ? segment.text ?? "" : "")
        .join("")
        .trim();
    return text;
}
function createUserMessage(prompt) {
    return {
        type: "message",
        role: "user",
        content: [
            {
                type: "input_text",
                text: prompt,
            },
        ],
    };
}
function resolveApprovalPolicy(mode) {
    switch (mode) {
        case AutoApprovalMode.AUTO_EDIT:
            return "auto-edit";
        case AutoApprovalMode.FULL_AUTO:
            return "full-auto";
        case AutoApprovalMode.SUGGEST:
        default:
            return "suggest";
    }
}
export function createAgentLoopRuntimeFactory(options) {
    return (sessionId) => new AgentLoopRuntime(sessionId, options);
}
