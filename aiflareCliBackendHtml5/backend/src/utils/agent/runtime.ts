// @ts-nocheck
import { ReviewDecision } from "./review.js";
import { isNativeResponseItem } from "./agent-events.js";
import { AgentLoop } from "./agent-loop.js";
import { loadConfig } from "../config.js";
import { AutoApprovalMode } from "../auto-approval-mode.js";
import { existsSync } from "node:fs";
class LegacyAgentRuntime {
    sessionId;
    legacyService;
    constructor(sessionId, legacyService) {
        this.sessionId = sessionId;
        this.legacyService = legacyService;
    }
    async runPrompt(prompt) {
        return this.legacyService.handlePrompt(this.sessionId, prompt);
    }
}
const DEFAULT_ASSISTANT_FALLBACK = "Okay";
class AgentLoopRuntime {
    sessionId;
    summary;
    agent;
    lastResponseId = "";
    lastAssistantMessage = DEFAULT_ASSISTANT_FALLBACK;
    workdir;
    constructor(sessionId, getSessionSummary, toolExecutorFactory) {
        this.sessionId = sessionId;
        const summary = getSessionSummary(sessionId);
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
            toolExecutor: toolExecutorFactory?.(summary),
        });
    }
    async runPrompt(prompt) {
        const message = createUserMessage(prompt);
        this.lastAssistantMessage = DEFAULT_ASSISTANT_FALLBACK;
        const previousCwd = process.cwd();
        try {
            process.chdir(this.workdir);
            await this.agent.run([message], this.lastResponseId);
        }
        finally {
            process.chdir(previousCwd);
        }
        return this.lastAssistantMessage;
    }
    dispose() {
        this.agent.terminate();
    }
    handleAgentItem(item) {
        if (!isNativeResponseItem(item)) {
            return;
        }
        if (item.type === "message" && item.role === "assistant") {
            const text = extractAssistantText(item);
            if (text.trim().length > 0) {
                this.lastAssistantMessage = text.trim();
            }
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
    return (sessionId) => new AgentLoopRuntime(sessionId, options.getSessionSummary, options.createToolExecutor);
}
export function createLegacyRuntimeFactory(legacyService) {
    return (sessionId) => new LegacyAgentRuntime(sessionId, legacyService);
}
