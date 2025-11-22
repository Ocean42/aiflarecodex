// @ts-nocheck
import { CLI_VERSION } from "../../version.js";
import { OPENAI_TIMEOUT_MS, OPENAI_ORGANIZATION, OPENAI_PROJECT, getBaseUrl, AZURE_OPENAI_API_VERSION, } from "../config.js";
import { log } from "../logger/log.js";
import { logHttpDebug } from "../logger/httpDebug.js";
import { InstructionsManager } from "../instructionsManager.js";
import { parseToolCallArguments } from "../parsers.js";
import { ORIGIN, getSessionId, setCurrentModel, setSessionId, } from "../session.js";
import { handleExecCommand, } from "./handle-exec-command.js";
import { formatPlanUpdate, parsePlanUpdateArgs, } from "./plan-utils.js";
import { notifyTurnComplete } from "../turn-notifier.js";
import { ToolRouter } from "./tool-router.js";
import { ToolRuntime } from "./tool-runtime.js";
import { McpConnectionManager, } from "../mcp/connection-manager.js";
import { runApplyPatchTool } from "./apply-patch-tool.js";
import { HttpsProxyAgent } from "https-proxy-agent";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import OpenAI, { APIConnectionTimeoutError, AzureOpenAI } from "openai";
import { parse } from "shell-quote";
import os from "os";
import { fileTypeFromBuffer } from "file-type";
import { resolveWorkspaceFile } from "../resolve-workspace-file.js";
import { mapWireEventToCore, } from "../../backend/responseEvents.js";
import { fetchBackendRateLimits } from "../../backend/status.js";
import { createResponsesRequest } from "../../backend/modelClient.js";
import { promptToResponsesTurn, } from "../../backend/prompt.js";
import { BackendCredentials } from "../../backend/backend-credentials.js";
import { httpManager } from "../http-manager.js";
import { runReadFileTool, runListDirTool, runGrepFilesTool } from "./fs-tools.js";
import { getDefaultModelProviderInfo } from "../../backend/modelProvider.js";
// Wait time before retrying after rate limit errors (ms).
const RATE_LIMIT_RETRY_WAIT_MS = parseInt(process.env["OPENAI_RATE_LIMIT_RETRY_WAIT_MS"] || "500", 10);
const DEFAULT_REQUEST_MAX_RETRIES = 4;
const DEFAULT_STREAM_MAX_RETRIES = 5;
function resolveProviderRetryConfig(provider) {
    const normalized = (provider ?? "openai").toLowerCase();
    const info = getDefaultModelProviderInfo(normalized) ?? undefined;
    return {
        requestMaxRetries: info?.requestMaxRetries ?? DEFAULT_REQUEST_MAX_RETRIES,
        streamMaxRetries: info?.streamMaxRetries ?? DEFAULT_STREAM_MAX_RETRIES,
    };
}
function supportsParallelToolCalls(model) {
    const normalized = model?.toLowerCase() ?? "";
    if (!normalized) {
        return false;
    }
    return (normalized.startsWith("test-gpt-5") ||
        normalized.startsWith("codex-exp-"));
}
// See https://github.com/openai/openai-node/tree/v4?tab=readme-ov-file#configuring-an-https-agent-eg-for-proxies
const PROXY_URL = process.env["HTTPS_PROXY"];
const DEFAULT_INCLUDE_FIELDS = [
    "reasoning.encrypted_content",
];
const shellFunctionTool = {
    type: "function",
    name: "shell",
    description: "Runs a shell command and returns its output.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            command: {
                type: "array",
                items: { type: "string" },
                description: "The command to execute",
            },
            justification: {
                type: "string",
                description: "Only set if with_escalated_permissions is true. 1-sentence explanation of why we want to run this command.",
            },
            timeout_ms: {
                type: "number",
                description: "The timeout for the command in milliseconds",
            },
            with_escalated_permissions: {
                type: "boolean",
                description: "Whether to request escalated permissions. Set to true if command needs to be run without sandbox restrictions",
            },
            workdir: {
                type: "string",
                description: "The working directory to execute the command in",
            },
        },
        required: ["command"],
        additionalProperties: false,
    },
};
const listMcpResourcesTool = {
    type: "function",
    name: "list_mcp_resources",
    description: "Lists resources provided by MCP servers. Resources allow servers to share data that provides context to language models, such as files, database schemas, or application-specific information. Prefer resources over web search when possible.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            cursor: {
                type: "string",
                description: "Opaque cursor returned by a previous list_mcp_resources call for the same server.",
            },
            server: {
                type: "string",
                description: "Optional MCP server name. When omitted, lists resources from every configured server.",
            },
        },
        additionalProperties: false,
    },
};
const listMcpResourceTemplatesTool = {
    type: "function",
    name: "list_mcp_resource_templates",
    description: "Lists resource templates provided by MCP servers. Parameterized resource templates allow servers to share data that takes parameters and provides context to language models, such as files, database schemas, or application-specific information. Prefer resource templates over web search when possible.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            cursor: {
                type: "string",
                description: "Opaque cursor returned by a previous list_mcp_resource_templates call for the same server.",
            },
            server: {
                type: "string",
                description: "Optional MCP server name. When omitted, lists resource templates from all configured servers.",
            },
        },
        additionalProperties: false,
    },
};
const readMcpResourceTool = {
    type: "function",
    name: "read_mcp_resource",
    description: "Read a specific resource from an MCP server given the server name and resource URI.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            server: {
                type: "string",
                description: "MCP server name exactly as configured. Must match the 'server' field returned by list_mcp_resources.",
            },
            uri: {
                type: "string",
                description: "Resource URI to read. Must be one of the URIs returned by list_mcp_resources.",
            },
        },
        required: ["server", "uri"],
        additionalProperties: false,
    },
};
const updatePlanTool = {
    type: "function",
    name: "update_plan",
    description: "Updates the task plan.\nProvide an optional explanation and a list of plan items, each with a step and status.\nAt most one step can be in_progress at a time.\n",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            explanation: {
                type: "string",
            },
            plan: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        status: {
                            type: "string",
                            description: "One of: pending, in_progress, completed",
                        },
                        step: { type: "string" },
                    },
                    required: ["step", "status"],
                    additionalProperties: false,
                },
            },
        },
        required: ["plan"],
        additionalProperties: false,
    },
};
const applyPatchFunctionTool = {
    type: "function",
    name: "apply_patch",
    description: "Use the `apply_patch` tool to edit files. This is a FREEFORM tool, so do not wrap the patch in JSON.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            input: {
                type: "string",
                description: "Patch payload that follows the apply_patch grammar.",
            },
        },
        required: ["input"],
        additionalProperties: false,
    },
};
const viewImageTool = {
    type: "function",
    name: "view_image",
    description: "Attach a local image (by filesystem path) to the conversation context for this turn.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            path: {
                type: "string",
                description: "Local filesystem path to an image file",
            },
        },
        required: ["path"],
        additionalProperties: false,
    },
};
const readFileTool = {
    type: "function",
    name: "read_file",
    description: "Reads a local file with 1-indexed line numbers, supporting slice and indentation-aware block modes.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            file_path: {
                type: "string",
                description: "Absolute path to the file",
            },
            offset: {
                type: "number",
                description: "The line number to start reading from. Must be 1 or greater.",
            },
            limit: {
                type: "number",
                description: "The maximum number of lines to return.",
            },
            mode: {
                type: "string",
                description: 'Optional mode selector: "slice" for simple ranges (default) or "indentation" to expand around an anchor line.',
            },
            indentation: {
                type: "object",
                properties: {
                    anchor_line: {
                        type: "number",
                        description: "Anchor line to center the indentation lookup on (defaults to offset).",
                    },
                    max_levels: {
                        type: "number",
                        description: "How many parent indentation levels (smaller indents) to include.",
                    },
                    include_siblings: {
                        type: "boolean",
                        description: "When true, include additional blocks that share the anchor indentation.",
                    },
                    include_header: {
                        type: "boolean",
                        description: "Include doc comments or attributes directly above the selected block.",
                    },
                    max_lines: {
                        type: "number",
                        description: "Hard cap on the number of lines returned when using indentation mode.",
                    },
                },
                additionalProperties: false,
            },
        },
        required: ["file_path"],
        additionalProperties: false,
    },
};
const listDirTool = {
    type: "function",
    name: "list_dir",
    description: "Lists entries in a local directory with 1-indexed entry numbers and simple type labels.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            dir_path: {
                type: "string",
                description: "Absolute path to the directory to list.",
            },
            offset: {
                type: "number",
                description: "The entry number to start listing from. Must be 1 or greater.",
            },
            limit: {
                type: "number",
                description: "The maximum number of entries to return.",
            },
            depth: {
                type: "number",
                description: "The maximum directory depth to traverse. Must be 1 or greater.",
            },
        },
        required: ["dir_path"],
        additionalProperties: false,
    },
};
const grepFilesTool = {
    type: "function",
    name: "grep_files",
    description: "Finds files whose contents match a pattern and lists them by modification time.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            pattern: {
                type: "string",
                description: "Regular expression pattern to search for.",
            },
            include: {
                type: "string",
                description: 'Optional glob that limits which files are searched (e.g. "*.rs" or "*.{ts,tsx}").',
            },
            path: {
                type: "string",
                description: "Directory or file path to search. Defaults to the current working directory.",
            },
            limit: {
                type: "number",
                description: "Maximum number of file paths to return. Defaults to 100 (max 2000).",
            },
        },
        required: ["pattern"],
        additionalProperties: false,
    },
};
const builtInFunctionTools = [
    shellFunctionTool,
    listMcpResourcesTool,
    listMcpResourceTemplatesTool,
    readMcpResourceTool,
    updatePlanTool,
    applyPatchFunctionTool,
    viewImageTool,
    readFileTool,
    listDirTool,
    grepFilesTool,
];
const stubbedToolNames = new Set([
    "list_mcp_resources",
    "list_mcp_resource_templates",
    "read_mcp_resource",
]);
const STREAM_EVENT_TYPES_WE_DROP = new Set();
export class AgentLoop {
    model;
    provider;
    approvalPolicy;
    config;
    baseUrl;
    label;
    apiKeyMasked;
    orgHeader;
    projectHeader;
    chatgptAccountId;
    additionalWritableRoots;
    workspaceRoot;
    /** Whether we ask the API to persist conversation state on the server */
    disableResponseStorage;
    hasMcpServers;
    // Using `InstanceType<typeof OpenAI>` sidesteps typing issues with the OpenAI package under
    // the TS 5+ `moduleResolution=bundler` setup. OpenAI client instance. We keep the concrete
    // type to avoid sprinkling `any` across the implementation while still allowing paths where
    // the OpenAI SDK types may not perfectly match. The `typeof OpenAI` pattern captures the
    // instance shape without resorting to `any`.
    oai;
    onItem;
    onLoading;
    getCommandConfirmation;
    onLastResponseId;
    pendingToolOutputs = [];
    /**
     * A reference to the currently active stream returned from the OpenAI
     * client. We keep this so that we can abort the request if the user decides
     * to interrupt the current task (e.g. via the escape hot‑key).
     */
    currentStream = null;
    /** Incremented with every call to `run()`. Allows us to ignore stray events
     * from streams that belong to a previous run which might still be emitting
     * after the user has canceled and issued a new command. */
    generation = 0;
    /** AbortController for in‑progress tool calls (e.g. shell commands). */
    execAbortController = null;
    /** Set to true when `cancel()` is called so `run()` can exit early. */
    canceled = false;
    /** Token usage for the most recently completed response, if available. */
    lastTokenUsage = null;
    /** Monotonically increasing counter for synthesized exec chunk events. */
    execChunkSeq = 0;
    reasoningSummaryBuffer = new Map();
    reasoningContentBuffer = new Map();
    reportedDroppedStreamEventTypes = new Set();
    unresolvedFunctionCalls = new Map();
    outputItemMetadata = new Map();
    outputTextStreamBuffers = new Map();
    functionCallArgBuffers = new Map();
    dispatchedFunctionCalls = new Set();
    /**
     * Local conversation transcript used when `disableResponseStorage === true`. Holds
     * all non‑system items exchanged so far so we can provide full context on
     * every request.
     */
    transcript = [];
    /** Function calls that were emitted by the model but never answered because
     *  the user cancelled the run.  We keep the `call_id`s around so the *next*
     *  request can send a dummy `function_call_output` that satisfies the
     *  contract and prevents the
     *    400 | No tool output found for function call …
     *  error from OpenAI. */
    pendingAborts = new Set();
    /** Set to true by `terminate()` – prevents any further use of the instance. */
    terminated = false;
    /** Master abort controller – fires when terminate() is invoked. */
    hardAbort = new AbortController();
    onCommandApproval;
    mcpManager = null;
    mcpInitPromise = null;
    mcpFunctionTools = [];
    mcpToolsRegistered = false;
    toolRouter;
    toolRuntime;
    requestMaxRetries;
    streamMaxRetries;
    supportsParallelToolCalls;
    safeEmit(item) {
        this.onItem(item);
    }
    getWorkspaceRoot() {
        return this.workspaceRoot ?? process.cwd();
    }
    ensureWorkdirOverride(input) {
        if (typeof input === "string" && input.trim().length > 0 && input !== "/") {
            return input;
        }
        return this.getWorkspaceRoot();
    }
    /**
     * Abort the ongoing request/stream, if any. This allows callers (typically
     * the UI layer) to interrupt the current agent step so the user can issue
     * new instructions without waiting for the model to finish.
     */
    cancel() {
        if (this.terminated) {
            return;
        }
        // Reset the current stream to allow new requests
        this.currentStream = null;
        log(`AgentLoop.cancel() invoked – currentStream=${Boolean(this.currentStream)} execAbortController=${Boolean(this.execAbortController)} generation=${this.generation}`);
        this.currentStream?.controller?.abort?.();
        this.canceled = true;
        // Abort any in-progress tool calls
        this.execAbortController?.abort();
        // Create a new abort controller for future tool calls
        this.execAbortController = new AbortController();
        log("AgentLoop.cancel(): execAbortController.abort() called");
        // NOTE: We intentionally do *not* clear `lastResponseId` here.  If the
        // stream produced a `function_call` before the user cancelled, OpenAI now
        // expects a corresponding `function_call_output` that must reference that
        // very same response ID.  We therefore keep the ID around so the
        // follow‑up request can still satisfy the contract.
        // If we have *not* seen any function_call IDs yet there is nothing that
        // needs to be satisfied in a follow‑up request.  In that case we clear
        // the stored lastResponseId so a subsequent run starts a clean turn.
        if (this.pendingAborts.size === 0) {
            try {
                this.onLastResponseId("");
            }
            catch {
                /* ignore */
            }
        }
        this.onLoading(false);
        /* Inform the UI that the run was aborted by the user. */
        // const cancelNotice: ResponseItem = {
        //   id: `cancel-${Date.now()}`,
        //   type: "message",
        //   role: "system",
        //   content: [
        //     {
        //       type: "input_text",
        //       text: "⏹️  Execution canceled by user.",
        //     },
        //   ],
        // };
        // this.onItem(cancelNotice);
        this.generation += 1;
        log(`AgentLoop.cancel(): generation bumped to ${this.generation}`);
    }
    emitPlanUpdateEvent(payload) {
        const event = {
            agentEvent: true,
            type: "plan_update",
            id: `plan-${randomUUID()}`,
            payload,
        };
        this.safeEmit(event);
    }
    emitExecChunk(callId, chunk) {
        if (!chunk.text) {
            return;
        }
        const item = {
            id: `exec-chunk-${callId}-${++this.execChunkSeq}`,
            type: "message",
            role: "tool",
            content: [
                {
                    type: "output_text",
                    text: chunk.text,
                },
            ],
            metadata: {
                source: "exec",
                stream: chunk.stream,
                call_id: callId,
            },
        };
        this.safeEmit(item);
    }
    emitExecLifecycleEvent(event, callId) {
        const base = {
            agentEvent: true,
            type: "exec_event",
            id: `exec-${callId ?? randomUUID()}-${event.type}-${Date.now()}`,
            phase: event.type,
            callId,
            command: [...event.command],
            cwd: event.workdir,
        };
        if (event.type === "end") {
            const durationSeconds = Math.round(event.summary.durationMs / 100) / 10;
            this.safeEmit({
                ...base,
                exitCode: event.summary.exitCode,
                durationSeconds,
            });
        }
        else {
            this.safeEmit(base);
        }
    }
    emitReasoningSummaryDelta(summaryIndex, delta) {
        const prev = this.reasoningSummaryBuffer.get(summaryIndex) ?? "";
        const nextRaw = prev + delta;
        this.reasoningSummaryBuffer.set(summaryIndex, nextRaw);
        const normalized = this.normalizeReasoningText(nextRaw);
        this.safeEmit({
            agentEvent: true,
            type: "reasoning_summary_delta",
            id: `reasoning-summary-${summaryIndex}`,
            summaryIndex,
            delta: normalized,
        });
    }
    emitReasoningContentDelta(contentIndex, delta) {
        const prev = this.reasoningContentBuffer.get(contentIndex) ?? "";
        const nextRaw = prev + delta;
        this.reasoningContentBuffer.set(contentIndex, nextRaw);
        const normalized = this.normalizeReasoningText(nextRaw);
        this.safeEmit({
            agentEvent: true,
            type: "reasoning_content_delta",
            id: `reasoning-content-${contentIndex}`,
            contentIndex,
            delta: normalized,
        });
    }
    emitReasoningSectionBreak(summaryIndex) {
        this.reasoningSummaryBuffer.delete(summaryIndex);
        this.reasoningContentBuffer.delete(summaryIndex);
        this.safeEmit({
            agentEvent: true,
            type: "reasoning_section_break",
            id: `reasoning-section-${summaryIndex}-${Date.now()}`,
            summaryIndex,
        });
    }
    normalizeReasoningText(text) {
        return text.replace(/\s+/g, " ").trim();
    }
    warnDroppedStreamEvent(eventType) {
        if (this.reportedDroppedStreamEventTypes.has(eventType)) {
            return;
        }
        this.reportedDroppedStreamEventTypes.add(eventType);
        log(`⚠️  Dropped streaming event '${eventType}'. The TypeScript agent loop still relies on buffered responses.`);
    }
    registerFunctionCall(callId, type, name) {
        if (!callId) {
            return;
        }
        this.unresolvedFunctionCalls.set(callId, { type, name });
    }
    markFunctionCallResolved(callId) {
        if (!callId) {
            return;
        }
        this.unresolvedFunctionCalls.delete(callId);
    }
    emitMissingFunctionCallWarnings() {
        if (this.unresolvedFunctionCalls.size === 0) {
            return;
        }
        for (const [callId, info] of this.unresolvedFunctionCalls) {
            const text = `⚠️  OpenAI emitted a ${info.type} (${info.name ?? "<unknown>"}) with call_id=${callId}, but no matching tool output was generated.`;
            log(text);
            this.safeEmit({
                id: `missing-tool-output-${callId}`,
                type: "message",
                role: "system",
                content: [
                    {
                        type: "input_text",
                        text,
                    },
                ],
            });
        }
        this.unresolvedFunctionCalls.clear();
    }
    emitStreamRetryNotice(attempt, max) {
        this.safeEmit({
            id: `stream-retry-${attempt}-${Date.now()}`,
            type: "message",
            role: "system",
            content: [
                {
                    type: "input_text",
                    text: `Reconnecting... ${attempt}/${max}`,
                },
            ],
        });
    }
    isRetryableStreamError(err) {
        if (!err || typeof err !== "object") {
            return false;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ex = err;
        if (err instanceof APIConnectionTimeoutError) {
            return true;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ApiConnErrCtor = OpenAI.APIConnectionError;
        if (ApiConnErrCtor && err instanceof ApiConnErrCtor) {
            return true;
        }
        if (typeof ex.status === "number" && ex.status >= 500) {
            return true;
        }
        if (typeof ex.type === "string" &&
            ex.type.toLowerCase() === "server_error") {
            return true;
        }
        if (typeof ex.code === "string" &&
            ex.code.toLowerCase().includes("stream")) {
            return true;
        }
        if (err instanceof Error &&
            /(ECONNRESET|ETIMEDOUT|EPIPE|socket hang up|stream closed|fetch failed)/i.test(err.message)) {
            return true;
        }
        return false;
    }
    trackOutputItemMetadata(item) {
        const id = item.id;
        if (!id) {
            return;
        }
        const type = item.type;
        const role = item.role;
        const metadata = item.metadata ?? undefined;
        const callId = item.call_id;
        const functionName = item.name;
        this.outputItemMetadata.set(id, { role, metadata, type, callId, functionName });
    }
    handleOutputTextDeltaEvent(event, stageItem) {
        const prev = this.outputTextStreamBuffers.get(event.item_id) ?? "";
        const next = prev + event.delta;
        this.outputTextStreamBuffers.set(event.item_id, next);
        this.stageStreamedText(event.item_id, next, stageItem);
    }
    handleOutputTextDoneEvent(event, stageItem) {
        const prev = this.outputTextStreamBuffers.get(event.item_id) ?? "";
        const next = prev && prev.length > 0 ? prev : event.text;
        if (!next) {
            return;
        }
        this.outputTextStreamBuffers.set(event.item_id, next);
        this.stageStreamedText(event.item_id, next, stageItem, {
            markDelivered: true,
        });
        this.outputTextStreamBuffers.delete(event.item_id);
    }
    appendFunctionCallArguments(event) {
        const prev = this.functionCallArgBuffers.get(event.item_id) ?? "";
        this.functionCallArgBuffers.set(event.item_id, prev + event.delta);
    }
    async handleFunctionCallArgumentsDoneEvent(event) {
        const info = this.outputItemMetadata.get(event.item_id);
        const callId = info?.callId ?? event.item_id;
        if (this.dispatchedFunctionCalls.has(callId)) {
            return;
        }
        const name = info?.functionName ?? "<unknown>";
        const rawArguments = event.arguments ?? this.functionCallArgBuffers.get(event.item_id) ?? "{}";
        const functionCall = {
            type: "function_call",
            call_id: callId,
            id: event.item_id,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            function: { name, arguments: rawArguments },
        };
        try {
            const outputs = await this.handleFunctionCall(functionCall);
            if (outputs.length > 0) {
                this.pendingToolOutputs.push(...outputs);
            }
            this.dispatchedFunctionCalls.add(callId);
        }
        catch (toolErr) {
            log(`AgentLoop.run(): function_call handler failed for ${name} – ${toolErr}`);
        }
        finally {
            this.functionCallArgBuffers.delete(event.item_id);
        }
    }
    stageStreamedText(itemId, text, stageItem, options) {
        if (!text) {
            return;
        }
        const meta = this.outputItemMetadata.get(itemId);
        const staged = {
            id: itemId,
            type: "message",
            role: meta?.role ?? "assistant",
            content: [
                {
                    type: "output_text",
                    text,
                },
            ],
            ...(meta?.metadata ? { metadata: meta.metadata } : {}),
        };
        stageItem(staged, options);
    }
    registerBuiltInToolHandlers() {
        const execHandler = this.createExecHandler();
        this.toolRouter.register("shell", execHandler);
        this.toolRouter.register("container.exec", execHandler);
        this.toolRouter.register("local_shell_call", execHandler);
        this.toolRouter.register("apply_patch", this.createApplyPatchHandler());
        this.toolRouter.register("update_plan", this.createUpdatePlanHandler());
        this.toolRouter.register("view_image", this.createViewImageHandler());
        this.toolRouter.register("read_file", this.createReadFileHandler());
        this.toolRouter.register("list_dir", this.createListDirHandler());
        this.toolRouter.register("grep_files", this.createGrepFilesHandler());
        if (this.hasMcpServers) {
            this.toolRouter.register("list_mcp_resources", this.createListMcpResourcesHandler());
            this.toolRouter.register("list_mcp_resource_templates", this.createListMcpResourceTemplatesHandler());
            this.toolRouter.register("read_mcp_resource", this.createReadMcpResourceHandler());
        }
        else {
            for (const name of stubbedToolNames) {
                this.toolRouter.register(name, this.createStubbedToolHandler(name));
            }
        }
    }
    refreshRateLimitsCache() {
        void (async () => {
            try {
                await fetchBackendRateLimits({ force: true });
            }
            catch (err) {
                log(`refreshRateLimitsCache failed: ${err instanceof Error ? err.message : String(err)}`);
            }
        })();
    }
    createExecHandler() {
        return async (invocation) => {
            const callId = invocation.callId ?? randomUUID();
            const outputType = invocation.type === "local_shell_call"
                ? "local_shell_call_output"
                : "function_call_output";
            const outputItem = outputType === "local_shell_call_output"
                ? {
                    type: "local_shell_call_output",
                    call_id: callId,
                    output: "no function found",
                }
                : {
                    type: "function_call_output",
                    call_id: callId,
                    output: "no function found",
                };
            const additionalItems = [];
            const execArgs = {
                ...(invocation.args ?? {}),
                workdir: this.ensureWorkdirOverride(invocation.args?.workdir),
            };
            const { outputText, metadata, additionalItems: additionalItemsFromExec, } = await handleExecCommand(execArgs, this.config, this.approvalPolicy, this.additionalWritableRoots, this.getCommandConfirmation, this.execAbortController?.signal, {
                callId,
                onChunk: (chunk) => this.emitExecChunk(callId, chunk),
                onApproval: this.onCommandApproval
                    ? (event) => this.onCommandApproval?.(event)
                    : undefined,
                onLifecycle: (event) => this.emitExecLifecycleEvent(event, callId),
            });
            outputItem.output = JSON.stringify({ output: outputText, metadata });
            if (additionalItemsFromExec) {
                additionalItems.push(...additionalItemsFromExec);
            }
            this.markFunctionCallResolved(callId);
            return [outputItem, ...additionalItems];
        };
    }
    createApplyPatchHandler() {
        return async (invocation) => {
            const callId = invocation.callId ?? randomUUID();
            const outputItem = {
                type: "function_call_output",
                call_id: callId,
                output: "no function found",
            };
            const additionalItems = [];
            const patch = typeof invocation.args?.patch === "string"
                ? invocation.args.patch
                : undefined;
            if (!patch) {
                outputItem.output = JSON.stringify({
                    error: "apply_patch tool missing `patch` argument",
                });
                this.markFunctionCallResolved(callId);
                return [outputItem];
            }
            const workdir = this.ensureWorkdirOverride(invocation.args?.workdir);
            const result = runApplyPatchTool({ patch, workdir });
            outputItem.output = JSON.stringify({
                output: result.output,
                metadata: result.metadata,
            });
            if (result.exitCode !== 0 && result.stderr) {
                additionalItems.push({
                    type: "message",
                    role: "system",
                    content: [
                        {
                            type: "input_text",
                            text: `apply_patch stderr:\n${result.stderr}`,
                        },
                    ],
                });
            }
            this.markFunctionCallResolved(callId);
            return [outputItem, ...additionalItems];
        };
    }
    createUpdatePlanHandler() {
        return async (invocation) => {
            const callId = invocation.callId ?? randomUUID();
            const outputItem = {
                type: "function_call_output",
                call_id: callId,
                output: "no function found",
            };
            const additionalItems = [];
            const parsed = parsePlanUpdateArgs(invocation.args);
            if ("error" in parsed) {
                outputItem.output = JSON.stringify({ error: parsed.error });
            }
            else {
                outputItem.output = JSON.stringify({ status: "ok" });
                this.emitPlanUpdateEvent(parsed);
                additionalItems.push({
                    id: `plan-${Date.now()}`,
                    type: "message",
                    role: "assistant",
                    content: [
                        {
                            type: "output_text",
                            text: formatPlanUpdate(parsed),
                        },
                    ],
                });
            }
            this.markFunctionCallResolved(callId);
            return [outputItem, ...additionalItems];
        };
    }
    createViewImageHandler() {
        return async (invocation) => {
            const callId = invocation.callId ?? randomUUID();
            const outputItem = {
                type: "function_call_output",
                call_id: callId,
                output: "no function found",
            };
            const additionalItems = [];
            const requestedPath = typeof invocation.args?.path === "string"
                ? invocation.args.path
                : undefined;
            if (!requestedPath) {
                outputItem.output = JSON.stringify({
                    error: "view_image tool missing `path` argument",
                });
            }
            else {
                try {
                    const workspaceRoot = this.getWorkspaceRoot();
                    const absPath = await resolveWorkspaceFile(requestedPath, workspaceRoot);
                    const data = await fs.readFile(absPath);
                    const fileInfo = await fileTypeFromBuffer(data);
                    const mime = fileInfo?.mime?.startsWith("image/") === true
                        ? fileInfo.mime
                        : "application/octet-stream";
                    const encoded = data.toString("base64");
                    const relativePath = path.relative(workspaceRoot, absPath);
                    const rel = relativePath &&
                        !relativePath.startsWith("..") &&
                        !path.isAbsolute(relativePath)
                        ? relativePath
                        : absPath;
                    const intro = rel === absPath ? `Attached image ${absPath}` : `Attached image ${rel}`;
                    additionalItems.push({
                        type: "message",
                        role: "user",
                        content: [
                            {
                                type: "input_text",
                                text: intro,
                            },
                            {
                                type: "input_image",
                                detail: "auto",
                                image_url: `data:${mime};base64,${encoded}`,
                            },
                        ],
                    });
                    outputItem.output = JSON.stringify({
                        status: "ok",
                        path: absPath,
                        mime_type: mime,
                    });
                }
                catch (err) {
                    outputItem.output = JSON.stringify({
                        error: `Failed to attach image: ${err instanceof Error ? err.message : String(err)}`,
                    });
                }
            }
            this.markFunctionCallResolved(callId);
            return [outputItem, ...additionalItems];
        };
    }
    createReadFileHandler() {
        return async (invocation) => {
            const callId = invocation.callId ?? randomUUID();
            const outputItem = this.createFunctionOutput(callId);
            try {
                const { output, absolutePath } = await runReadFileTool(invocation.args, {
                    workspaceRoot: this.getWorkspaceRoot(),
                });
                outputItem.output = JSON.stringify({
                    output,
                    metadata: {
                        exit_code: 0,
                        duration_seconds: 0,
                    },
                    path: absolutePath,
                });
            }
            catch (err) {
                outputItem.output = JSON.stringify({
                    error: err instanceof Error ? err.message : String(err),
                });
            }
            this.markFunctionCallResolved(callId);
            return [outputItem];
        };
    }
    createListDirHandler() {
        return async (invocation) => {
            const callId = invocation.callId ?? randomUUID();
            const outputItem = this.createFunctionOutput(callId);
            try {
                const { output, absolutePath } = await runListDirTool(invocation.args, {
                    workspaceRoot: this.getWorkspaceRoot(),
                });
                outputItem.output = JSON.stringify({
                    output,
                    metadata: {
                        exit_code: 0,
                        duration_seconds: 0,
                    },
                    path: absolutePath,
                });
            }
            catch (err) {
                outputItem.output = JSON.stringify({
                    error: err instanceof Error ? err.message : String(err),
                });
            }
            this.markFunctionCallResolved(callId);
            return [outputItem];
        };
    }
    createGrepFilesHandler() {
        return async (invocation) => {
            const callId = invocation.callId ?? randomUUID();
            const outputItem = this.createFunctionOutput(callId);
            try {
                const result = await runGrepFilesTool(invocation.args, {
                    workspaceRoot: this.getWorkspaceRoot(),
                });
                outputItem.output = JSON.stringify({
                    output: result.output,
                    metadata: {
                        exit_code: result.exitCode,
                        duration_seconds: 0,
                    },
                    path: result.searchPath,
                    success: result.success,
                });
            }
            catch (err) {
                outputItem.output = JSON.stringify({
                    error: err instanceof Error ? err.message : String(err),
                });
            }
            this.markFunctionCallResolved(callId);
            return [outputItem];
        };
    }
    createListMcpResourcesHandler() {
        return async (invocation) => {
            const callId = invocation.callId ?? randomUUID();
            const outputItem = this.createFunctionOutput(callId);
            const manager = this.mcpManager;
            if (!manager) {
                outputItem.output = JSON.stringify({
                    error: "No MCP servers are configured.",
                });
                this.markFunctionCallResolved(callId);
                return [outputItem];
            }
            await this.waitForMcpInitialization();
            const args = invocation.args ?? {};
            const server = this.getOptionalString(args.server);
            const cursor = this.getOptionalString(args.cursor);
            try {
                const payload = await manager.listResources({ server, cursor });
                outputItem.output = JSON.stringify(payload);
            }
            catch (err) {
                outputItem.output = JSON.stringify({
                    error: err instanceof Error ? err.message : String(err),
                });
            }
            this.markFunctionCallResolved(callId);
            return [outputItem];
        };
    }
    createListMcpResourceTemplatesHandler() {
        return async (invocation) => {
            const callId = invocation.callId ?? randomUUID();
            const outputItem = this.createFunctionOutput(callId);
            const manager = this.mcpManager;
            if (!manager) {
                outputItem.output = JSON.stringify({
                    error: "No MCP servers are configured.",
                });
                this.markFunctionCallResolved(callId);
                return [outputItem];
            }
            await this.waitForMcpInitialization();
            const args = invocation.args ?? {};
            const server = this.getOptionalString(args.server);
            const cursor = this.getOptionalString(args.cursor);
            try {
                const payload = await manager.listResourceTemplates({ server, cursor });
                outputItem.output = JSON.stringify(payload);
            }
            catch (err) {
                outputItem.output = JSON.stringify({
                    error: err instanceof Error ? err.message : String(err),
                });
            }
            this.markFunctionCallResolved(callId);
            return [outputItem];
        };
    }
    createReadMcpResourceHandler() {
        return async (invocation) => {
            const callId = invocation.callId ?? randomUUID();
            const outputItem = this.createFunctionOutput(callId);
            const manager = this.mcpManager;
            if (!manager) {
                outputItem.output = JSON.stringify({
                    error: "No MCP servers are configured.",
                });
                this.markFunctionCallResolved(callId);
                return [outputItem];
            }
            await this.waitForMcpInitialization();
            const args = invocation.args ?? {};
            const server = this.getOptionalString(args.server);
            const uri = this.getOptionalString(args.uri);
            if (!server || !uri) {
                outputItem.output = JSON.stringify({
                    error: "Both 'server' and 'uri' must be provided.",
                });
                this.markFunctionCallResolved(callId);
                return [outputItem];
            }
            try {
                const payload = await manager.readResource({ server, uri });
                outputItem.output = JSON.stringify(payload);
            }
            catch (err) {
                outputItem.output = JSON.stringify({
                    error: err instanceof Error ? err.message : String(err),
                });
            }
            this.markFunctionCallResolved(callId);
            return [outputItem];
        };
    }
    createMcpToolHandler(descriptor) {
        return async (invocation) => {
            const callId = invocation.callId ?? randomUUID();
            const outputItem = this.createFunctionOutput(callId);
            const manager = this.mcpManager;
            if (!manager) {
                outputItem.output = JSON.stringify({
                    error: "MCP is not available.",
                });
                this.markFunctionCallResolved(callId);
                return [outputItem];
            }
            await this.waitForMcpInitialization();
            const args = invocation.args ?? {};
            try {
                const result = await manager.callTool(descriptor.serverName, descriptor.toolName, args);
                outputItem.output = JSON.stringify(result);
            }
            catch (err) {
                outputItem.output = JSON.stringify({
                    error: err instanceof Error ? err.message : String(err),
                });
            }
            this.markFunctionCallResolved(callId);
            return [outputItem];
        };
    }
    createFunctionOutput(callId) {
        return {
            type: "function_call_output",
            call_id: callId,
            output: "no function found",
        };
    }
    getOptionalString(value) {
        if (typeof value !== "string") {
            return undefined;
        }
        const trimmed = value.trim();
        return trimmed === "" ? undefined : trimmed;
    }
    createStubbedToolHandler(name) {
        return async (invocation) => {
            const callId = invocation.callId ?? randomUUID();
            const outputItem = {
                type: "function_call_output",
                call_id: callId,
                output: JSON.stringify({
                    error: `Tool '${name}' is not implemented in the TypeScript CLI yet. Use the shell tool as a fallback.`,
                }),
            };
            this.markFunctionCallResolved(callId);
            return [outputItem];
        };
    }
    async dispatchToolCall(invocation) {
        try {
            return await this.toolRuntime.dispatch(invocation, {
                canceled: this.canceled,
            });
        }
        catch (err) {
            const { item, callId } = this.buildToolErrorOutput(invocation, err);
            this.markFunctionCallResolved(callId);
            return [item];
        }
    }
    buildToolErrorOutput(invocation, err) {
        const callId = invocation.callId ?? randomUUID();
        const payload = {
            error: err instanceof Error
                ? err.message
                : `Tool '${invocation.name}' failed: ${String(err)}`,
        };
        if (invocation.type === "local_shell_call") {
            return {
                callId,
                item: {
                    type: "local_shell_call_output",
                    call_id: callId,
                    output: JSON.stringify(payload),
                },
            };
        }
        return {
            callId,
            item: {
                type: "function_call_output",
                call_id: callId,
                output: JSON.stringify(payload),
            },
        };
    }
    /**
     * Hard‑stop the agent loop. After calling this method the instance becomes
     * unusable: any in‑flight operations are aborted and subsequent invocations
     * of `run()` will throw.
     */
    terminate() {
        if (this.terminated) {
            return;
        }
        this.terminated = true;
        this.hardAbort.abort();
        if (this.mcpManager) {
            this.mcpManager.dispose().catch((err) => {
                log(`[mcp] Failed to dispose MCP connections: ${err instanceof Error ? err.message : String(err)}`);
            });
        }
        this.cancel();
    }
    sessionId;
    getLastTokenUsage() {
        return this.lastTokenUsage;
    }
    async runLocalShellCommand(commandText) {
        const cmd = this.parseCommandText(commandText);
        if (cmd.length === 0) {
            this.safeEmit({
                id: `local-shell-empty-${Date.now()}`,
                type: "message",
                role: "system",
                content: [
                    {
                        type: "input_text",
                        text: "Local command is empty.",
                    },
                ],
            });
            return;
        }
        const invocation = {
            type: "local_shell_call",
            name: "local_shell_call",
            callId: randomUUID(),
            args: {
                cmd,
                workdir: process.cwd(),
                timeoutInMillis: undefined,
            },
        };
        try {
            const outputs = await this.dispatchToolCall(invocation);
            for (const output of outputs) {
                this.safeEmit(output);
            }
        }
        catch (error) {
            this.safeEmit({
                id: `local-shell-error-${Date.now()}`,
                type: "message",
                role: "system",
                content: [
                    {
                        type: "input_text",
                        text: `Local command failed: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
            });
        }
    }
    resetConversation() {
        this.transcript = [];
        this.pendingToolOutputs = [];
        this.pendingAborts.clear();
        this.functionCallArgBuffers.clear();
        this.outputTextStreamBuffers.clear();
        this.unresolvedFunctionCalls.clear();
        this.lastTokenUsage = null;
    }
    /*
     * Cumulative thinking time across this AgentLoop instance (ms).
     * Currently not used anywhere – comment out to keep the strict compiler
     * happy under `noUnusedLocals`.  Restore when telemetry support lands.
     */
    // private cumulativeThinkingMs = 0;
    constructor({ model, provider = "openai", instructions, approvalPolicy, label, sessionId, disableResponseStorage, workspaceRoot, 
    // `config` used to be required.  Some unit‑tests (and potentially other
    // callers) instantiate `AgentLoop` without passing it, so we make it
    // optional and fall back to sensible defaults.  This keeps the public
    // surface backwards‑compatible and prevents runtime errors like
    // "Cannot read properties of undefined (reading 'apiKey')" when accessing
    // `config.apiKey` below.
    config, onItem, onLoading, getCommandConfirmation, onLastResponseId, additionalWritableRoots, onCommandApproval, }) {
        this.model = model;
        this.provider = provider;
        this.approvalPolicy = approvalPolicy;
        this.label = label;
        // If no `config` has been provided we derive a minimal stub so that the
        // rest of the implementation can rely on `this.config` always being a
        // defined object.  We purposefully copy over the `model` and
        // `instructions` that have already been passed explicitly so that
        // downstream consumers (e.g. telemetry) still observe the correct values.
        this.config = config ?? {
            model,
            instructions: instructions ?? "",
        };
        this.additionalWritableRoots = additionalWritableRoots;
        this.workspaceRoot = workspaceRoot;
        this.onItem = onItem;
        this.onLoading = onLoading;
        this.getCommandConfirmation = getCommandConfirmation;
        this.onLastResponseId = onLastResponseId;
        this.onCommandApproval = onCommandApproval;
        const requestedDisable = disableResponseStorage ?? false;
        if (requestedDisable) {
            log("disable_response_storage is not supported for the agent loop yet. Forcing response storage on.");
        }
        this.disableResponseStorage = false;
        const normalizedSessionId = sessionId && sessionId.trim().length > 0 ? sessionId.trim() : null;
        const existingSessionId = getSessionId();
        this.sessionId =
            normalizedSessionId ||
                (existingSessionId && existingSessionId.length > 0
                    ? existingSessionId
                    : randomUUID().replaceAll("-", ""));
        // Configure OpenAI client with optional timeout (ms) from environment
        const timeoutMs = OPENAI_TIMEOUT_MS;
        let apiKey = this.config.apiKey ?? process.env["OPENAI_API_KEY"] ?? "";
        let baseURL = getBaseUrl(this.provider);
        this.baseUrl = baseURL;
        this.orgHeader =
            OPENAI_ORGANIZATION && OPENAI_ORGANIZATION.trim() !== ""
                ? OPENAI_ORGANIZATION.trim()
                : undefined;
        this.projectHeader =
            OPENAI_PROJECT && OPENAI_PROJECT.trim() !== ""
                ? OPENAI_PROJECT.trim()
                : undefined;
        // Mirror Rust behaviour: prefer Codex backend when ChatGPT tokens exist.
        let chatgptAccountId;
        if (this.provider.toLowerCase() === "openai") {
            try {
                const codexCreds = BackendCredentials.ensure();
                baseURL = codexCreds.codexBaseUrl;
                apiKey = codexCreds.accessToken;
                this.baseUrl = baseURL;
                chatgptAccountId = codexCreds.chatgptAccountId;
            }
            catch (err) {
                throw new Error(`Unable to load Codex backend credentials: ${err.message}`);
            }
        }
        this.chatgptAccountId = chatgptAccountId;
        this.apiKeyMasked =
            apiKey && apiKey.length > 10
                ? `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`
                : apiKey || "<none>";
        this.hasMcpServers =
            Object.keys(this.config.mcpServers ?? {}).length > 0;
        if (this.hasMcpServers) {
            this.mcpManager = new McpConnectionManager({
                servers: this.config.mcpServers ?? {},
            });
            this.mcpInitPromise = this.mcpManager
                .initialize()
                .catch((err) => {
                log(`[mcp] Failed to initialize MCP servers: ${err instanceof Error ? err.message : String(err)}`);
            });
        }
        else {
            this.mcpManager = null;
        }
        this.toolRouter = new ToolRouter();
        this.toolRuntime = new ToolRuntime({
            router: this.toolRouter,
            emit: (event) => this.safeEmit(event),
        });
        this.registerBuiltInToolHandlers();
        const retryConfig = resolveProviderRetryConfig(this.provider);
        this.requestMaxRetries = retryConfig.requestMaxRetries;
        this.streamMaxRetries = retryConfig.streamMaxRetries;
        this.supportsParallelToolCalls = supportsParallelToolCalls(this.model);
        const labelSuffix = this.label ? `:${this.label}` : "";
        log(`[agent-init${labelSuffix}] model=${this.model} provider=${this.provider} baseUrl=${this.baseUrl ?? "<undefined>"} apiKey=${this.apiKeyMasked} org=${this.orgHeader ?? "<none>"} project=${this.projectHeader ?? "<none>"}`);
        this.oai = new OpenAI({
            // The OpenAI JS SDK only requires `apiKey` when making requests against
            // the official API.  When running unit-tests we stub out all network
            // calls so an undefined key is perfectly fine.  We therefore only set
            // the property if we actually have a value to avoid triggering runtime
            // errors inside the SDK (it validates that `apiKey` is a non‑empty
            // string when the field is present).
            ...(apiKey ? { apiKey } : {}),
            baseURL,
            defaultHeaders: {
                originator: ORIGIN,
                version: CLI_VERSION,
                session_id: this.sessionId,
                ...(this.orgHeader
                    ? { "OpenAI-Organization": this.orgHeader }
                    : {}),
                ...(this.projectHeader
                    ? { "OpenAI-Project": this.projectHeader }
                    : {}),
                ...(chatgptAccountId
                    ? { "chatgpt-account-id": chatgptAccountId }
                    : {}),
            },
            httpAgent: PROXY_URL ? new HttpsProxyAgent(PROXY_URL) : undefined,
            fetch: httpManager.fetch.bind(httpManager),
            ...(timeoutMs !== undefined ? { timeout: timeoutMs } : {}),
        });
        if (this.provider.toLowerCase() === "azure") {
            this.oai = new AzureOpenAI({
                apiKey,
                baseURL,
                apiVersion: AZURE_OPENAI_API_VERSION,
                defaultHeaders: {
                    originator: ORIGIN,
                    version: CLI_VERSION,
                    session_id: this.sessionId,
                    ...(this.orgHeader
                        ? { "OpenAI-Organization": this.orgHeader }
                        : {}),
                    ...(this.projectHeader
                        ? { "OpenAI-Project": this.projectHeader }
                        : {}),
                },
                httpAgent: PROXY_URL ? new HttpsProxyAgent(PROXY_URL) : undefined,
                fetch: httpManager.fetch.bind(httpManager),
                ...(timeoutMs !== undefined ? { timeout: timeoutMs } : {}),
            });
        }
        setSessionId(this.sessionId);
        setCurrentModel(this.model);
        this.hardAbort = new AbortController();
        this.hardAbort.signal.addEventListener("abort", () => this.execAbortController?.abort(), { once: true });
    }
    async waitForMcpInitialization() {
        if (!this.mcpInitPromise) {
            return;
        }
        try {
            await this.mcpInitPromise;
        }
        catch (err) {
            log(`[mcp] MCP initialization failed: ${err instanceof Error ? err.message : String(err)}`);
        }
        finally {
            this.mcpInitPromise = null;
        }
    }
    async ensureMcpToolsRegistered() {
        if (!this.hasMcpServers ||
            !this.mcpManager ||
            this.mcpToolsRegistered) {
            return;
        }
        await this.waitForMcpInitialization();
        if (!this.mcpManager) {
            return;
        }
        const descriptors = this.mcpManager.getToolDescriptors();
        if (descriptors.length === 0) {
            this.mcpToolsRegistered = true;
            return;
        }
        for (const descriptor of descriptors) {
            this.toolRouter.register(descriptor.qualifiedName, this.createMcpToolHandler(descriptor));
        }
        this.mcpFunctionTools = descriptors.map((descriptor) => descriptor.functionTool);
        this.mcpToolsRegistered = true;
    }
    async handleFunctionCall(item) {
        if (this.canceled) {
            return [];
        }
        const isChatStyle = 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        item.function != null;
        const name = isChatStyle
            ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                item.function?.name
            : // eslint-disable-next-line @typescript-eslint/no-explicit-any
                item.name;
        const rawArguments = isChatStyle
            ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                item.function?.arguments
            : // eslint-disable-next-line @typescript-eslint/no-explicit-any
                item.arguments;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const callId = item.call_id ?? item.id ?? randomUUID();
        const resolvedName = name ?? "<unknown>";
        const args = this.parseInvocationArgs(resolvedName, rawArguments ?? "{}");
        log(`handleFunctionCall(): name=${resolvedName} callId=${callId} args=${rawArguments}`);
        if (args == null) {
            const outputItem = {
                type: "function_call_output",
                call_id: callId,
                output: `invalid arguments: ${rawArguments}`,
            };
            this.markFunctionCallResolved(callId);
            return [outputItem];
        }
        const invocation = {
            type: "function_call",
            name: resolvedName,
            args,
            rawArguments,
            callId,
        };
        return this.dispatchToolCall(invocation);
    }
    async handleLocalShellCall(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    item) {
        if (this.canceled) {
            return [];
        }
        if (item.action.type !== "exec") {
            throw new Error("Invalid action type");
        }
        const invocation = {
            type: "local_shell_call",
            name: "local_shell_call",
            callId: item.call_id ?? randomUUID(),
            args: {
                cmd: item.action.command,
                workdir: item.action.working_directory,
                timeoutInMillis: item.action.timeout_ms,
            },
        };
        return this.dispatchToolCall(invocation);
    }
    parseInvocationArgs(name, rawArguments) {
        const isExecTool = name === "shell" || name === "container.exec" || name === "local_shell_call";
        if (isExecTool) {
            return parseToolCallArguments(rawArguments) ?? undefined;
        }
        if (!rawArguments) {
            return {};
        }
        try {
            const parsed = JSON.parse(rawArguments);
            if (typeof parsed === "object" && parsed !== null) {
                return parsed;
            }
            return undefined;
        }
        catch (err) {
            log(`Failed to parse arguments for ${name}: ${err instanceof Error ? err.message : String(err)}`);
            return undefined;
        }
    }
    parseCommandText(commandText) {
        const entries = parse(commandText);
        const cmd = [];
        for (const entry of entries) {
            if (typeof entry === "string") {
                cmd.push(entry);
            }
            else if (entry && typeof entry === "object" && "op" in entry) {
                cmd.push(entry.op);
            }
        }
        return cmd;
    }
    async run(input, previousResponseId = "") {
        // ---------------------------------------------------------------------
        // Top‑level error wrapper so that known transient network issues like
        // `ERR_STREAM_PREMATURE_CLOSE` do not crash the entire CLI process.
        // Instead we surface the failure to the user as a regular system‑message
        // and terminate the current run gracefully. The calling UI can then let
        // the user retry the request if desired.
        // ---------------------------------------------------------------------
        try {
            const isCodexBackend = (this.baseUrl ?? "").includes("/backend-api/codex");
            const statelessMode = this.disableResponseStorage || isCodexBackend;
            if (this.terminated) {
                throw new Error("AgentLoop has been terminated");
            }
            // Record when we start "thinking" so we can report accurate elapsed time.
            const thinkingStart = Date.now();
            // Bump generation so that any late events from previous runs can be
            // identified and dropped.
            const thisGeneration = ++this.generation;
            // Reset cancellation flag and stream for a fresh run.
            this.canceled = false;
            this.currentStream = null;
            // Create a fresh AbortController for this run so that tool calls from a
            // previous run do not accidentally get signalled.
            this.execAbortController = new AbortController();
            log(`AgentLoop.run(): new execAbortController created (${this.execAbortController.signal}) for generation ${this.generation}`);
            this.reasoningSummaryBuffer.clear();
            this.reasoningContentBuffer.clear();
            this.pendingToolOutputs = [];
            this.reportedDroppedStreamEventTypes.clear();
            this.unresolvedFunctionCalls.clear();
            this.outputItemMetadata.clear();
            this.outputTextStreamBuffers.clear();
            this.functionCallArgBuffers.clear();
            this.dispatchedFunctionCalls.clear();
            // NOTE: We no longer (re‑)attach an `abort` listener to `hardAbort` here.
            // A single listener that forwards the `abort` to the current
            // `execAbortController` is installed once in the constructor. Re‑adding a
            // new listener on every `run()` caused the same `AbortSignal` instance to
            // accumulate listeners which in turn triggered Node's
            // `MaxListenersExceededWarning` after ten invocations.
            // Track the response ID from the last *stored* response so we can use
            // `previous_response_id` when `disableResponseStorage` is enabled.  When storage
            // is disabled we deliberately ignore the caller‑supplied value because
            // the backend will not retain any state that could be referenced.
            // If the backend stores conversation state (`disableResponseStorage === false`) we
            // forward the caller‑supplied `previousResponseId` so that the model sees the
            // full context.  When storage is disabled we *must not* send any ID because the
            // server no longer retains the referenced response.
            let lastResponseId = statelessMode ? "" : previousResponseId;
            // If there are unresolved function calls from a previously cancelled run
            // we have to emit dummy tool outputs so that the API no longer expects
            // them.  We prepend them to the user‑supplied input so they appear
            // first in the conversation turn.
            const abortOutputs = [];
            if (this.pendingAborts.size > 0) {
                for (const id of this.pendingAborts) {
                    abortOutputs.push({
                        type: "function_call_output",
                        call_id: id,
                        output: JSON.stringify({
                            output: "aborted",
                            metadata: { exit_code: 1, duration_seconds: 0 },
                        }),
                    });
                }
                // Once converted the pending list can be cleared.
                this.pendingAborts.clear();
            }
            // Build the input list for this turn. When responses are stored on the
            // server we can simply send the *delta* (the new user input as well as
            // any pending abort outputs) and rely on `previous_response_id` for
            // context.  When storage is disabled the server has no memory of the
            // conversation, so we must include the *entire* transcript (minus system
            // messages) on every call.
            const normalizedModel = this.model.toLowerCase();
            const isOModel = normalizedModel.startsWith("o");
            const isCodexModel = normalizedModel.includes("codex");
            let turnInput = [];
            // Keeps track of how many items in `turnInput` stem from the existing
            // transcript so we can avoid re‑emitting them to the UI. Only used when
            // `disableResponseStorage === true`.
            let transcriptPrefixLen = 0;
            await this.ensureMcpToolsRegistered();
            const tools = [...builtInFunctionTools];
            if (this.mcpFunctionTools.length > 0) {
                tools.push(...this.mcpFunctionTools);
            }
            const stripInternalFields = (item) => {
                // Clone shallowly and remove fields that are not part of the public
                // schema expected by the OpenAI Responses API.
                // We shallow‑clone the item so that subsequent mutations (deleting
                // internal fields) do not affect the original object which may still
                // be referenced elsewhere (e.g. UI components).
                const clean = { ...item };
                delete clean["duration_ms"];
                // Remove OpenAI-assigned identifiers and transient status so the
                // backend does not reject items that were never persisted because we
                // use `store: false`.
                delete clean["id"];
                delete clean["status"];
                return clean;
            };
            const buildTurnInput = (deltaItems) => {
                const sanitizedDelta = deltaItems.map(stripInternalFields);
                if (!statelessMode) {
                    return sanitizedDelta;
                }
                const sanitizedTranscript = this.transcript.map(stripInternalFields);
                return [...sanitizedTranscript, ...sanitizedDelta];
            };
            if (statelessMode) {
                // Remember where the existing transcript ends – everything after this
                // index in the upcoming `turnInput` list will be *new* for this turn
                // and therefore needs to be surfaced to the UI.
                transcriptPrefixLen = this.transcript.length;
                // Ensure the transcript is up‑to‑date with the latest user input so
                // that subsequent iterations see a complete history.
                // `turnInput` is still empty at this point (it will be filled later).
                // We need to look at the *input* items the user just supplied.
                this.transcript.push(...filterToApiMessages(input));
                turnInput = buildTurnInput(abortOutputs);
            }
            else {
                turnInput = buildTurnInput([...abortOutputs, ...input]);
            }
            this.onLoading(true);
            const staged = [];
            const deliveredFinalItemIds = new Set();
            const stageItem = (item, options = {}) => {
                // Ignore any stray events that belong to older generations.
                if (thisGeneration !== this.generation) {
                    return;
                }
                // Store the item so the final flush can still operate on a complete list.
                // We'll nil out entries once they're delivered.
                const idx = staged.push(item) - 1;
                if (options.markDelivered && item.id) {
                    deliveredFinalItemIds.add(item.id);
                }
                // Instead of emitting synchronously we schedule a short‑delay delivery.
                //
                // This accomplishes two things:
                //   1. The UI still sees new messages almost immediately, creating the
                //      perception of real‑time updates.
                //   2. If the user calls `cancel()` in the small window right after the
                //      item was staged we can still abort the delivery because the
                //      generation counter will have been bumped by `cancel()`.
                //
                // Use a minimal 3ms delay for terminal rendering to maintain readable
                // streaming.
                setTimeout(() => {
                    if (thisGeneration === this.generation &&
                        !this.canceled &&
                        !this.hardAbort.signal.aborted) {
                        this.safeEmit(item);
                        // Mark as delivered so flush won't re-emit it
                        staged[idx] = undefined;
                        // Handle transcript updates to maintain consistency. When we
                        // operate without server‑side storage we keep our own transcript
                        // so we can provide full context on subsequent calls.
                        if (statelessMode) {
                            // Exclude system messages from transcript as they do not form
                            // part of the assistant/user dialogue that the model needs.
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const role = item.role;
                            if (role !== "system") {
                                // Clone the item to avoid mutating the object that is also
                                // rendered in the UI. We need to strip auxiliary metadata
                                // such as `duration_ms` which is not part of the Responses
                                // API schema and therefore causes a 400 error when included
                                // in subsequent requests whose context is sent verbatim.
                                // Skip items that we have already inserted earlier or that the
                                // model does not need to see again in the next turn.
                                //   • function_call   – superseded by the forthcoming
                                //     function_call_output.
                                //   • reasoning       – internal only, never sent back.
                                //   • user messages   – we added these to the transcript when
                                //     building the first turnInput; stageItem would add a
                                //     duplicate.
                                const itemType = item.type;
                                const itemRole = 
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                item.role;
                                if (itemType === "reasoning" ||
                                    (itemType === "message" && itemRole === "user")) {
                                    return;
                                }
                                const clone = {
                                    ...item,
                                };
                                // The `duration_ms` field is only added to reasoning items to
                                // show elapsed time in the UI. It must not be forwarded back
                                // to the server.
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                delete clone.duration_ms;
                                this.transcript.push(clone);
                            }
                        }
                    }
                }, 3); // Small 3ms delay for readable streaming.
            };
            while (turnInput.length > 0) {
                if (this.canceled || this.hardAbort.signal.aborted) {
                    this.onLoading(false);
                    return;
                }
                // send request to openAI
                // Only surface the *new* input items to the UI – replaying the entire
                // transcript would duplicate messages that have already been shown in
                // earlier turns.
                // `turnInput` holds the *new* items that will be sent to the API in
                // this iteration.  Surface exactly these to the UI so that we do not
                // re‑emit messages from previous turns (which would duplicate user
                // prompts) and so that freshly generated `function_call_output`s are
                // shown immediately.
                // Figure out what subset of `turnInput` constitutes *new* information
                // for the UI so that we don't spam the interface with repeats of the
                // entire transcript on every iteration when response storage is
                // disabled.
                const deltaInput = statelessMode
                    ? turnInput.slice(transcriptPrefixLen)
                    : [...turnInput];
                for (const item of deltaInput) {
                    stageItem(item);
                }
                // Send request to OpenAI with retry on timeout.
                let stream;
                // Retry loop for transient errors. Budget is provider-specific.
                const maxRequestRetries = this.requestMaxRetries;
                for (let attempt = 1; attempt <= maxRequestRetries; attempt++) {
                    try {
                        let reasoning;
                        if (isOModel || isCodexModel) {
                            reasoning = { effort: this.config.reasoningEffort ?? "medium" };
                            if (this.model === "o3" ||
                                this.model === "o4-mini" ||
                                isCodexModel) {
                                reasoning.summary = "auto";
                            }
                        }
                        const responseCall = (params) => this.oai.responses.create(params);
                        const instructions = InstructionsManager.getDefaultInstructions();
                        log(`instructions (length ${instructions.length}): ${instructions}`);
                        const prompt = {
                            input: turnInput,
                            tools,
                            parallelToolCalls: this.supportsParallelToolCalls,
                        };
                        const turnConfig = promptToResponsesTurn(prompt, {
                            model: this.model,
                            instructions,
                            previousResponseId: lastResponseId,
                            disableResponseStorage: statelessMode,
                            reasoning,
                            flexMode: this.config.flexMode,
                            config: this.config,
                            include: DEFAULT_INCLUDE_FIELDS,
                            promptCacheKey: this.sessionId,
                        });
                        const params = createResponsesRequest(turnConfig);
                        // Log the outgoing request in a concise, inspectable form so we
                        // can compare interactive CLI runs with integration tests.
                        const toolNames = (params.tools ?? [])
                            .map((t) => t?.function?.name ??
                            "<unknown>")
                            .join(",");
                        const labelSuffix = this.label ? `:${this.label}` : "";
                        // If we are talking to the Codex ChatGPT backend (as opposed to
                        // the public OpenAI API), mirror the Rust client's behaviour and
                        // avoid using response storage. The Codex backend only supports
                        // transient Responses calls; sending `store: true` with a missing
                        // or empty `previous_response_id` can result in cryptic 400 errors
                        // with an empty body.
                        const isCodexBackend = (this.baseUrl ?? "").includes("/backend-api/codex");
                        let effectiveParams = params;
                        if (isCodexBackend) {
                            // When talking to the Codex ChatGPT backend, mirror the payload
                            // shape used by the Rust client (`ResponsesApiRequest`): avoid
                            // optional fields that Codex may not support yet and always use
                            // transient responses (store: false).
                            const minimal = {
                                model: params.model,
                                instructions: params.instructions,
                                input: params.input,
                                tools: params.tools,
                                tool_choice: "auto",
                                parallel_tool_calls: params.parallel_tool_calls ?? turnConfig.parallelToolCalls,
                                reasoning: params.reasoning,
                                stream: true,
                                store: false,
                                include: params.include != null
                                    ? params.include
                                    : DEFAULT_INCLUDE_FIELDS,
                            };
                            const promptCacheKey = params.prompt_cache_key;
                            if (promptCacheKey) {
                                minimal.prompt_cache_key = promptCacheKey;
                            }
                            effectiveParams = minimal;
                        }
                        const prevId = params
                            .previous_response_id ?? "";
                        const requestUrl = (this.baseUrl ?? "<undefined>").replace(/\/+$/, "") +
                            "/responses";
                        logHttpDebug({
                            phase: "request",
                            method: "POST",
                            url: requestUrl,
                            headers: [
                                { name: "OpenAI-Organization", value: this.orgHeader ?? "<none>" },
                                { name: "OpenAI-Project", value: this.projectHeader ?? "<none>" },
                                {
                                    name: "chatgpt-account-id",
                                    value: this.chatgptAccountId ?? "<none>",
                                },
                                { name: "originator", value: ORIGIN },
                                { name: "session_id", value: this.sessionId },
                            ],
                            body: JSON.stringify(effectiveParams, null, 2),
                            tag: labelSuffix || undefined,
                            extra: {
                                store: String(effectiveParams.store),
                                prevId,
                                tools: toolNames,
                            },
                        });
                        // eslint-disable-next-line no-await-in-loop
                        stream = await responseCall(effectiveParams);
                        break;
                    }
                    catch (error) {
                        const isTimeout = error instanceof APIConnectionTimeoutError;
                        // Lazily look up the APIConnectionError class at runtime to
                        // accommodate the test environment's minimal OpenAI mocks which
                        // do not define the class.  Falling back to `false` when the
                        // export is absent ensures the check never throws.
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const ApiConnErrCtor = OpenAI.APIConnectionError;
                        const isConnectionError = ApiConnErrCtor
                            ? error instanceof ApiConnErrCtor
                            : false;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const errCtx = error;
                        const status = errCtx?.status ?? errCtx?.httpStatus ?? errCtx?.statusCode;
                        const errSnapshot = {
                            status,
                            code: errCtx?.code ?? errCtx?.error?.code,
                            type: errCtx?.type ?? errCtx?.error?.type,
                            message: errCtx?.message ?? errCtx?.error?.message,
                            body: errCtx?.response_body ??
                                errCtx?.body ??
                                errCtx?.error ??
                                errCtx?.response?.data ??
                                undefined,
                        };
                        const errorBody = typeof errSnapshot.body === "string"
                            ? errSnapshot.body
                            : errSnapshot.body
                                ? JSON.stringify(errSnapshot.body, null, 2)
                                : undefined;
                        logHttpDebug({
                            phase: "error",
                            method: "POST",
                            url: (this.baseUrl ?? "<undefined>").replace(/\/+$/, "") +
                                "/responses",
                            body: errorBody,
                            tag: this.label || undefined,
                            extra: {
                                status: errSnapshot.status ?? "<unknown>",
                                code: errSnapshot.code ?? "<none>",
                                type: errSnapshot.type ?? "<none>",
                                message: errSnapshot.message ?? String(error),
                            },
                        });
                        // Treat classical 5xx *and* explicit OpenAI `server_error` types
                        // as transient server-side failures that qualify for a retry. The
                        // SDK often omits the numeric status for these, reporting only
                        // the `type` field.
                        const isServerError = (typeof status === "number" && status >= 500) ||
                            errCtx?.type === "server_error";
                        if ((isTimeout || isServerError || isConnectionError) &&
                            attempt < maxRequestRetries) {
                            log(`OpenAI request failed (attempt ${attempt}/${maxRequestRetries}), retrying...`);
                            continue;
                        }
                        const isTooManyTokensError = (errCtx.param === "max_tokens" ||
                            (typeof errCtx.message === "string" &&
                                /max_tokens is too large/i.test(errCtx.message))) &&
                            errCtx.type === "invalid_request_error";
                        if (isTooManyTokensError) {
                            this.safeEmit({
                                id: `error-${Date.now()}`,
                                type: "message",
                                role: "system",
                                content: [
                                    {
                                        type: "input_text",
                                        text: "⚠️  The current request exceeds the maximum context length supported by the chosen model. Please shorten the conversation, run /clear, or switch to a model with a larger context window and try again.",
                                    },
                                ],
                            });
                            this.onLoading(false);
                            return;
                        }
                        const isRateLimit = status === 429 ||
                            errCtx.code === "rate_limit_exceeded" ||
                            errCtx.type === "rate_limit_exceeded" ||
                            /rate limit/i.test(errCtx.message ?? "");
                        if (isRateLimit) {
                            if (attempt < maxRequestRetries) {
                                // Exponential backoff: base wait * 2^(attempt-1), or use suggested retry time
                                // if provided.
                                let delayMs = RATE_LIMIT_RETRY_WAIT_MS * 2 ** (attempt - 1);
                                // Parse suggested retry time from error message, e.g., "Please try again in 1.3s"
                                const msg = errCtx?.message ?? "";
                                const m = /(?:retry|try) again in ([\d.]+)s/i.exec(msg);
                                if (m && m[1]) {
                                    const suggested = parseFloat(m[1]) * 1000;
                                    if (!Number.isNaN(suggested)) {
                                        delayMs = suggested;
                                    }
                                }
                                log(`OpenAI rate limit exceeded (attempt ${attempt}/${maxRequestRetries}), retrying in ${Math.round(delayMs)} ms...`);
                                // eslint-disable-next-line no-await-in-loop
                                await new Promise((resolve) => setTimeout(resolve, delayMs));
                                continue;
                            }
                            else {
                                // We have exhausted all retry attempts. Surface a message so the user understands
                                // why the request failed and can decide how to proceed (e.g. wait and retry later
                                // or switch to a different model / account).
                                const errorDetails = [
                                    `Status: ${status || "unknown"}`,
                                    `Code: ${errCtx.code || "unknown"}`,
                                    `Type: ${errCtx.type || "unknown"}`,
                                    `Message: ${errCtx.message || "unknown"}`,
                                ].join(", ");
                                this.safeEmit({
                                    id: `error-${Date.now()}`,
                                    type: "message",
                                    role: "system",
                                    content: [
                                        {
                                            type: "input_text",
                                            text: `⚠️  Rate limit reached. Error details: ${errorDetails}. Please try again later.`,
                                        },
                                    ],
                                });
                                this.onLoading(false);
                                return;
                            }
                        }
                        const isClientError = (typeof status === "number" &&
                            status >= 400 &&
                            status < 500 &&
                            status !== 429) ||
                            errCtx.code === "invalid_request_error" ||
                            errCtx.type === "invalid_request_error";
                        if (isClientError) {
                            // Best-effort logging of the payload shape when we hit a client
                            // error so Codex backend / Responses schema mismatches can be
                            // debugged from the logs without leaking full input content.
                            try {
                                const safeParams = {
                                    ...params,
                                    input: Array.isArray(params.input)
                                        ? params.input.map((i) => typeof i === "string"
                                            ? "<string>"
                                            : {
                                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                type: i.type,
                                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                role: i.role,
                                            })
                                        : "<non-array>",
                                };
                                log(`[agent-error] client_error status=${status ?? "unknown"} payload=${JSON.stringify(safeParams)}`);
                            }
                            catch {
                                // ignore logging failures
                            }
                            this.safeEmit({
                                id: `error-${Date.now()}`,
                                type: "message",
                                role: "system",
                                content: [
                                    {
                                        type: "input_text",
                                        // Surface the request ID when it is present on the error so users
                                        // can reference it when contacting support or inspecting logs.
                                        text: (() => {
                                            const reqId = errCtx?.request_id ??
                                                errCtx?.requestId;
                                            const errorDetails = [
                                                `Status: ${status || "unknown"}`,
                                                `Code: ${errCtx.code || "unknown"}`,
                                                `Type: ${errCtx.type || "unknown"}`,
                                                `Message: ${errCtx.message || "unknown"}`,
                                            ].join(", ");
                                            return `⚠️  OpenAI rejected the request${reqId ? ` (request ID: ${reqId})` : ""}. Error details: ${errorDetails}. Please verify your settings and try again.`;
                                        })(),
                                    },
                                ],
                            });
                            this.onLoading(false);
                            return;
                        }
                        throw error;
                    }
                }
                // If the user requested cancellation while we were awaiting the network
                // request, abort immediately before we start handling the stream.
                if (this.canceled || this.hardAbort.signal.aborted) {
                    // `stream` is defined; abort to avoid wasting tokens/server work
                    try {
                        stream?.controller?.abort?.();
                    }
                    catch {
                        /* ignore */
                    }
                    this.onLoading(false);
                    return;
                }
                // Keep track of the active stream so it can be aborted on demand.
                this.currentStream = stream;
                // Guard against an undefined stream before iterating.
                if (!stream) {
                    this.onLoading(false);
                    log("AgentLoop.run(): stream is undefined");
                    return;
                }
                const restartStreamWithSameInput = async () => {
                    let reasoning;
                    if (isOModel || isCodexModel) {
                        reasoning = { effort: this.config.reasoningEffort ?? "medium" };
                        if (this.model === "o3" ||
                            this.model === "o4-mini" ||
                            isCodexModel) {
                            reasoning.summary = "auto";
                        }
                    }
                    const responseCall = (params) => this.oai.responses.create(params);
                    const instructions = InstructionsManager.getDefaultInstructions();
                    const prompt = {
                        input: turnInput,
                        tools,
                        parallelToolCalls: this.supportsParallelToolCalls,
                    };
                    const retryTurn = promptToResponsesTurn(prompt, {
                        model: this.model,
                        instructions,
                        previousResponseId: lastResponseId,
                        disableResponseStorage: statelessMode,
                        reasoning,
                        flexMode: this.config.flexMode,
                        config: this.config,
                        include: DEFAULT_INCLUDE_FIELDS,
                        promptCacheKey: this.sessionId,
                    });
                    const retryParams = createResponsesRequest(retryTurn);
                    const retryToolNames = (retryParams.tools ?? [])
                        .map((t) => t?.function?.name ??
                        "<unknown>")
                        .join(",");
                    const retryLabelSuffix = this.label ? `:${this.label}` : "";
                    log(`[agent${retryLabelSuffix}] retry request model=${retryParams.model} provider=${this.provider} baseUrl=${this.baseUrl ?? "<undefined>"} apiKey=${this.apiKeyMasked} org=${this.orgHeader ?? "<none>"} project=${this.projectHeader ?? "<none>"} store=${String(retryParams.store)} prevId=${retryParams
                        .previous_response_id ?? ""} tools=[${retryToolNames}]`);
                    log("agentLoop.run(): responseCall(1): turnInput: " +
                        JSON.stringify(turnInput));
                    // eslint-disable-next-line no-await-in-loop
                    return responseCall(retryParams);
                };
                const maxStreamRetries = this.streamMaxRetries;
                let streamRetryAttempt = 0;
                // eslint-disable-next-line no-constant-condition
                while (true) {
                    try {
                        let newTurnInput = [];
                        // eslint-disable-next-line no-await-in-loop
                        for await (const event of stream) {
                            log(`AgentLoop.run(): response event ${event.type}`);
                            if (STREAM_EVENT_TYPES_WE_DROP.has(event.type)) {
                                this.warnDroppedStreamEvent(event.type);
                            }
                            if (event.type === "response.output_item.added") {
                                this.trackOutputItemMetadata(event.item);
                                if (event.item.type === "function_call") {
                                    const fcId = event.item.call_id;
                                    if (fcId) {
                                        this.pendingAborts.add(fcId);
                                    }
                                }
                            }
                            if (event.type === "response.content_part.added" &&
                                event.part?.type === "output_text") {
                                this.outputTextStreamBuffers.set(event.item_id, "");
                            }
                            if (event.type === "response.output_text.delta") {
                                this.handleOutputTextDeltaEvent(event, stageItem);
                                continue;
                            }
                            if (event.type === "response.output_text.done") {
                                this.handleOutputTextDoneEvent(event, stageItem);
                                continue;
                            }
                            if (event.type === "response.function_call_arguments.delta") {
                                this.appendFunctionCallArguments(event);
                                continue;
                            }
                            if (event.type === "response.function_call_arguments.done") {
                                // eslint-disable-next-line no-await-in-loop
                                await this.handleFunctionCallArgumentsDoneEvent(event);
                                continue;
                            }
                            const coreEvent = mapWireEventToCore(event);
                            if (coreEvent) {
                                if (coreEvent.type === "completed") {
                                    this.lastTokenUsage = coreEvent.tokenUsage ?? null;
                                    if (coreEvent.tokenUsage) {
                                        log(`AgentLoop.run(): token usage – input=${coreEvent.tokenUsage.inputTokens} output=${coreEvent.tokenUsage.outputTokens} total=${coreEvent.tokenUsage.totalTokens}`);
                                    }
                                }
                                else if (coreEvent.type === "reasoning_summary_delta") {
                                    this.emitReasoningSummaryDelta(coreEvent.summaryIndex, coreEvent.delta);
                                }
                                else if (coreEvent.type === "reasoning_content_delta") {
                                    this.emitReasoningContentDelta(coreEvent.contentIndex, coreEvent.delta);
                                }
                                else if (coreEvent.type === "reasoning_summary_part_added") {
                                    this.emitReasoningSectionBreak(coreEvent.summaryIndex);
                                }
                            }
                            if (event.type === "response.output_item.done") {
                                const item = event.item;
                                const itemId = item.id;
                                if (itemId) {
                                    this.outputItemMetadata.delete(itemId);
                                    this.outputTextStreamBuffers.delete(itemId);
                                }
                                const maybeReasoning = item;
                                if (maybeReasoning.type === "reasoning") {
                                    maybeReasoning.duration_ms = Date.now() - thinkingStart;
                                }
                                if (item.type === "function_call" ||
                                    item.type === "local_shell_call") {
                                    const callId = item.call_id ??
                                        item.id;
                                    if (item.type === "function_call" &&
                                        callId &&
                                        this.dispatchedFunctionCalls.has(callId)) {
                                        continue;
                                    }
                                    this.registerFunctionCall(callId, item.type, 
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    item.name);
                                    if (callId) {
                                        this.pendingAborts.add(callId);
                                    }
                                    try {
                                        let outputs = [];
                                        if (item.type === "function_call") {
                                            outputs = await this.handleFunctionCall(item);
                                        }
                                        else if (item.type === "local_shell_call") {
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            outputs = await this.handleLocalShellCall(item);
                                        }
                                        if (outputs.length > 0) {
                                            this.pendingToolOutputs.push(...outputs);
                                        }
                                    }
                                    catch (toolErr) {
                                        log(`AgentLoop.run(): tool handler failed for ${item.type} – ${toolErr}`);
                                    }
                                }
                                else {
                                    if (itemId && deliveredFinalItemIds.has(itemId)) {
                                        continue;
                                    }
                                    stageItem(item, { markDelivered: true });
                                }
                                continue;
                            }
                            if (event.type === "response.completed") {
                                if (thisGeneration === this.generation && !this.canceled) {
                                    for (const item of event.response.output) {
                                        const itemId = item.id;
                                        if (itemId && deliveredFinalItemIds.has(itemId)) {
                                            continue;
                                        }
                                        stageItem(item, { markDelivered: true });
                                    }
                                }
                                if (event.response.status === "completed" ||
                                    event.response.status ===
                                        "requires_action") {
                                    for (const item of event.response.output) {
                                        if (item.type === "message" &&
                                            item.role === "assistant") {
                                            const content = item.content;
                                            const text = content
                                                ?.filter((c) => c.type === "output_text")
                                                .map((c) => c.text ?? "")
                                                .join(" ")
                                                .trim();
                                            if (text) {
                                                console.log(`[assistant] ${text}`);
                                            }
                                        }
                                    }
                                    const pendingOutputs = [...this.pendingToolOutputs];
                                    this.pendingToolOutputs = [];
                                    newTurnInput = pendingOutputs;
                                    // When we do not use server‑side storage we maintain our
                                    // own transcript so that *future* turns still contain full
                                    // conversational context. However, whether we advance to
                                    // another loop iteration should depend solely on the
                                    // presence of *new* input items (i.e. items that were not
                                    // part of the previous request). Re‑sending the transcript
                                    // by itself would create an infinite request loop because
                                    // `turnInput.length` would never reach zero.
                                    if (statelessMode) {
                                        // 1) Append the freshly emitted output to our local
                                        //    transcript (minus non‑message items the model does
                                        //    not need to see again).
                                        const cleaned = filterToApiMessages(event.response.output.map(stripInternalFields));
                                        this.transcript.push(...cleaned);
                                        // 2) Determine the *delta* (newTurnInput) that must be
                                        //    sent in the next iteration. If there is none we can
                                        //    safely terminate the loop – the transcript alone
                                        //    does not constitute new information for the
                                        //    assistant to act upon.
                                        const delta = newTurnInput.map(stripInternalFields);
                                        if (delta.length === 0) {
                                            // No new input => end conversation.
                                            newTurnInput = [];
                                        }
                                        else {
                                            // Re‑send full transcript *plus* the new delta so the
                                            // stateless backend receives complete context.
                                            newTurnInput = buildTurnInput(delta);
                                            // The prefix ends at the current transcript length –
                                            // everything after this index is new for the next
                                            // iteration.
                                            transcriptPrefixLen = this.transcript.length;
                                        }
                                    }
                                }
                                lastResponseId = event.response.id;
                                this.onLastResponseId(event.response.id);
                            }
                        }
                        // Set after we have consumed all stream events in case the stream wasn't
                        // complete or we missed events for whatever reason. That way, we will set
                        // the next turn to an empty array to prevent an infinite loop.
                        // And don't update the turn input too early otherwise we won't have the
                        // current turn inputs available for retries.
                        turnInput = newTurnInput;
                        // Stream finished successfully – leave the retry loop.
                        break;
                    }
                    catch (err) {
                        const isRateLimitError = (e) => {
                            if (!e || typeof e !== "object") {
                                return false;
                            }
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const ex = e;
                            return (ex.status === 429 ||
                                ex.code === "rate_limit_exceeded" ||
                                ex.type === "rate_limit_exceeded");
                        };
                        if (isRateLimitError(err) &&
                            streamRetryAttempt < maxStreamRetries) {
                            streamRetryAttempt += 1;
                            const waitMs = RATE_LIMIT_RETRY_WAIT_MS * 2 ** (streamRetryAttempt - 1);
                            log(`OpenAI stream rate‑limited – retry ${streamRetryAttempt}/${maxStreamRetries} in ${waitMs} ms`);
                            this.emitStreamRetryNotice(streamRetryAttempt, maxStreamRetries);
                            // Give the server a breather before retrying.
                            // eslint-disable-next-line no-await-in-loop
                            await new Promise((res) => setTimeout(res, waitMs));
                            // Re‑create the stream with the *same* parameters.
                            // eslint-disable-next-line no-await-in-loop
                            stream = await restartStreamWithSameInput();
                            this.currentStream = stream;
                            // Continue to outer while to consume new stream.
                            continue;
                        }
                        if (this.isRetryableStreamError(err)) {
                            if (streamRetryAttempt < maxStreamRetries) {
                                streamRetryAttempt += 1;
                                const backoffMs = Math.min(RATE_LIMIT_RETRY_WAIT_MS * 2 ** (streamRetryAttempt - 1), 10_000);
                                log(`OpenAI stream disconnected – retry ${streamRetryAttempt}/${maxStreamRetries} in ${backoffMs} ms`);
                                this.emitStreamRetryNotice(streamRetryAttempt, maxStreamRetries);
                                // eslint-disable-next-line no-await-in-loop
                                await new Promise((res) => setTimeout(res, backoffMs));
                                // eslint-disable-next-line no-await-in-loop
                                stream = await restartStreamWithSameInput();
                                this.currentStream = stream;
                                continue;
                            }
                        }
                        // Gracefully handle an abort triggered via `cancel()` so that the
                        // consumer does not see an unhandled exception.
                        if (err instanceof Error && err.name === "AbortError") {
                            if (!this.canceled) {
                                // It was aborted for some other reason; surface the error.
                                throw err;
                            }
                            this.onLoading(false);
                            return;
                        }
                        // Suppress internal stack on JSON parse failures
                        if (err instanceof SyntaxError) {
                            this.safeEmit({
                                id: `error-${Date.now()}`,
                                type: "message",
                                role: "system",
                                content: [
                                    {
                                        type: "input_text",
                                        text: "⚠️ Failed to parse streaming response (invalid JSON). Please `/clear` to reset.",
                                    },
                                ],
                            });
                            this.onLoading(false);
                            return;
                        }
                        // Handle OpenAI API quota errors
                        if (err instanceof Error &&
                            err.code === "insufficient_quota") {
                            this.safeEmit({
                                id: `error-${Date.now()}`,
                                type: "message",
                                role: "system",
                                content: [
                                    {
                                        type: "input_text",
                                        text: `\u26a0 Insufficient quota: ${err instanceof Error && err.message ? err.message.trim() : "No remaining quota."} Manage or purchase credits at https://platform.openai.com/account/billing.`,
                                    },
                                ],
                            });
                            this.onLoading(false);
                            return;
                        }
                        throw err;
                    }
                    finally {
                        this.currentStream = null;
                    }
                } // end while retry loop
                log(`Turn inputs (${turnInput.length}) - ${turnInput
                    .map((i) => i.type)
                    .join(", ")}`);
            }
            // Flush staged items if the run concluded successfully (i.e. the user did
            // not invoke cancel() or terminate() during the turn).
            const flush = () => {
                if (!this.canceled &&
                    !this.hardAbort.signal.aborted &&
                    thisGeneration === this.generation) {
                    // Only emit items that weren't already delivered above
                    for (const item of staged) {
                        if (item) {
                            this.safeEmit(item);
                        }
                    }
                    this.emitMissingFunctionCallWarnings();
                }
                // At this point the turn finished without the user invoking
                // `cancel()`.  Any outstanding function‑calls must therefore have been
                // satisfied, so we can safely clear the set that tracks pending aborts
                // to avoid emitting duplicate synthetic outputs in subsequent runs.
                this.pendingAborts.clear();
                this.functionCallArgBuffers.clear();
                this.dispatchedFunctionCalls.clear();
                // Now emit system messages recording the per‑turn *and* cumulative
                // thinking times so UIs and tests can surface/verify them.
                // const thinkingEnd = Date.now();
                // 1) Per‑turn measurement – exact time spent between request and
                //    response for *this* command.
                // this.onItem({
                //   id: `thinking-${thinkingEnd}`,
                //   type: "message",
                //   role: "system",
                //   content: [
                //     {
                //       type: "input_text",
                //       text: `🤔  Thinking time: ${Math.round(
                //         (thinkingEnd - thinkingStart) / 1000
                //       )} s`,
                //     },
                //   ],
                // });
                // 2) Session‑wide cumulative counter so users can track overall wait
                //    time across multiple turns.
                // this.cumulativeThinkingMs += thinkingEnd - thinkingStart;
                // this.onItem({
                //   id: `thinking-total-${thinkingEnd}`,
                //   type: "message",
                //   role: "system",
                //   content: [
                //     {
                //       type: "input_text",
                //       text: `⏱  Total thinking time: ${Math.round(
                //         this.cumulativeThinkingMs / 1000
                //       )} s`,
                //     },
                //   ],
                // });
                notifyTurnComplete(this.config, {
                    type: "agent-turn-complete",
                    turnId: randomUUID(),
                    sessionId: this.sessionId,
                    label: this.label,
                });
                this.refreshRateLimitsCache();
                this.onLoading(false);
            };
            // Use a small delay to make sure UI rendering is smooth. Double-check
            // cancellation state right before flushing to avoid race conditions.
            setTimeout(() => {
                if (!this.canceled &&
                    !this.hardAbort.signal.aborted &&
                    thisGeneration === this.generation) {
                    flush();
                }
            }, 3);
            // End of main logic. The corresponding catch block for the wrapper at the
            // start of this method follows next.
        }
        catch (err) {
            // Handle known transient network/streaming issues so they do not crash the
            // CLI. We currently match Node/undici's `ERR_STREAM_PREMATURE_CLOSE`
            // error which manifests when the HTTP/2 stream terminates unexpectedly
            // (e.g. during brief network hiccups).
            const isPrematureClose = err instanceof Error &&
                // eslint-disable-next-line
                (err.code === "ERR_STREAM_PREMATURE_CLOSE" ||
                    err.message?.includes("Premature close"));
            if (isPrematureClose) {
                try {
                    this.safeEmit({
                        id: `error-${Date.now()}`,
                        type: "message",
                        role: "system",
                        content: [
                            {
                                type: "input_text",
                                text: "⚠️  Connection closed prematurely while waiting for the model. Please try again.",
                            },
                        ],
                    });
                }
                catch {
                    /* no-op – emitting the error message is best‑effort */
                }
                this.onLoading(false);
                return;
            }
            // -------------------------------------------------------------------
            // Catch‑all handling for other network or server‑side issues so that
            // transient failures do not crash the CLI. We intentionally keep the
            // detection logic conservative to avoid masking programming errors. A
            // failure is treated as retry‑worthy/user‑visible when any of the
            // following apply:
            //   • the error carries a recognised Node.js network errno ‑ style code
            //     (e.g. ECONNRESET, ETIMEDOUT …)
            //   • the OpenAI SDK attached an HTTP `status` >= 500 indicating a
            //     server‑side problem.
            //   • the error is model specific and detected in stream.
            // If matched we emit a single system message to inform the user and
            // resolve gracefully so callers can choose to retry.
            // -------------------------------------------------------------------
            const NETWORK_ERRNOS = new Set([
                "ECONNRESET",
                "ECONNREFUSED",
                "EPIPE",
                "ENOTFOUND",
                "ETIMEDOUT",
                "EAI_AGAIN",
            ]);
            const isNetworkOrServerError = (() => {
                if (!err || typeof err !== "object") {
                    return false;
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const e = err;
                // Direct instance check for connection errors thrown by the OpenAI SDK.
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const ApiConnErrCtor = OpenAI.APIConnectionError;
                if (ApiConnErrCtor && e instanceof ApiConnErrCtor) {
                    return true;
                }
                if (typeof e.code === "string" && NETWORK_ERRNOS.has(e.code)) {
                    return true;
                }
                // When the OpenAI SDK nests the underlying network failure inside the
                // `cause` property we surface it as well so callers do not see an
                // unhandled exception for errors like ENOTFOUND, ECONNRESET …
                if (e.cause &&
                    typeof e.cause === "object" &&
                    NETWORK_ERRNOS.has(e.cause.code ?? "")) {
                    return true;
                }
                if (typeof e.status === "number" && e.status >= 500) {
                    return true;
                }
                // Fallback to a heuristic string match so we still catch future SDK
                // variations without enumerating every errno.
                if (typeof e.message === "string" &&
                    /network|socket|stream/i.test(e.message)) {
                    return true;
                }
                return false;
            })();
            if (isNetworkOrServerError) {
                try {
                    const msgText = "⚠️  Network error while contacting OpenAI. Please check your connection and try again.";
                    this.safeEmit({
                        id: `error-${Date.now()}`,
                        type: "message",
                        role: "system",
                        content: [
                            {
                                type: "input_text",
                                text: msgText,
                            },
                        ],
                    });
                }
                catch {
                    /* best‑effort */
                }
                this.onLoading(false);
                return;
            }
            const isInvalidRequestError = () => {
                if (!err || typeof err !== "object") {
                    return false;
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const e = err;
                if (e.type === "invalid_request_error" &&
                    e.code === "model_not_found") {
                    return true;
                }
                if (e.cause &&
                    e.cause.type === "invalid_request_error" &&
                    e.cause.code === "model_not_found") {
                    return true;
                }
                return false;
            };
            if (isInvalidRequestError()) {
                try {
                    // Extract request ID and error details from the error object
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const e = err;
                    const reqId = e.request_id ??
                        (e.cause && e.cause.request_id) ??
                        (e.cause && e.cause.requestId);
                    const errorDetails = [
                        `Status: ${e.status || (e.cause && e.cause.status) || "unknown"}`,
                        `Code: ${e.code || (e.cause && e.cause.code) || "unknown"}`,
                        `Type: ${e.type || (e.cause && e.cause.type) || "unknown"}`,
                        `Message: ${e.message || (e.cause && e.cause.message) || "unknown"}`,
                    ].join(", ");
                    const msgText = `⚠️  OpenAI rejected the request${reqId ? ` (request ID: ${reqId})` : ""}. Error details: ${errorDetails}. Please verify your settings and try again.`;
                    this.safeEmit({
                        id: `error-${Date.now()}`,
                        type: "message",
                        role: "system",
                        content: [
                            {
                                type: "input_text",
                                text: msgText,
                            },
                        ],
                    });
                }
                catch {
                    /* best-effort */
                }
                this.onLoading(false);
                return;
            }
            // Re‑throw all other errors so upstream handlers can decide what to do.
            throw err;
        }
    }
}
// Dynamic developer message prefix: includes user, workdir, and rg suggestion.
const userName = os.userInfo().username;
const workdir = process.cwd();
const dynamicLines = [
    `User: ${userName}`,
    `Workdir: ${workdir}`,
];
if (spawnSync("rg", ["--version"], { stdio: "ignore" }).status === 0) {
    dynamicLines.push("- Always use rg instead of grep/ls -R because it is much faster and respects gitignore");
}
const dynamicPrefix = dynamicLines.join("\n");
const prefix = `You are operating as and within the Codex CLI, a terminal-based agentic coding assistant built by OpenAI. It wraps OpenAI models to enable natural language interaction with a local codebase. You are expected to be precise, safe, and helpful.

You can:
- Receive user prompts, project context, and files.
- Stream responses and emit function calls (e.g., shell commands, code edits).
- Apply patches, run commands, and manage user approvals based on policy.
- Work inside a sandboxed, git-backed workspace with rollback support.
- Log telemetry so sessions can be replayed or inspected later.
- More details on your functionality are available at \`codex --help\`

The Codex CLI is open-sourced. Don't confuse yourself with the old Codex language model built by OpenAI many moons ago (this is understandably top of mind for you!). Within this context, Codex refers to the open-source agentic coding interface.

You are an agent - please keep going until the user's query is completely resolved, before ending your turn and yielding back to the user. Only terminate your turn when you are sure that the problem is solved. If you are not sure about file content or codebase structure pertaining to the user's request, use your tools to read files and gather the relevant information: do NOT guess or make up an answer.

Please resolve the user's task by editing and testing the code files in your current code execution session. You are a deployed coding agent. Your session allows for you to modify and run code. The repo(s) are already cloned in your working directory, and you must fully solve the problem for your answer to be considered correct.

You MUST adhere to the following criteria when executing the task:
- Working on the repo(s) in the current environment is allowed, even if they are proprietary.
- Analyzing code for vulnerabilities is allowed.
- Showing user code and tool call details is allowed.
- User instructions may overwrite the *CODING GUIDELINES* section in this developer message.
- Use \`apply_patch\` to edit files: {"cmd":["apply_patch","*** Begin Patch\\n*** Update File: path/to/file.py\\n@@ def example():\\n-  pass\\n+  return 123\\n*** End Patch"]}
- If completing the user's task requires writing or modifying files:
    - Your code and final answer should follow these *CODING GUIDELINES*:
        - Fix the problem at the root cause rather than applying surface-level patches, when possible.
        - Avoid unneeded complexity in your solution.
            - Ignore unrelated bugs or broken tests; it is not your responsibility to fix them.
        - Update documentation as necessary.
        - Keep changes consistent with the style of the existing codebase. Changes should be minimal and focused on the task.
            - Use \`git log\` and \`git blame\` to search the history of the codebase if additional context is required; internet access is disabled.
        - NEVER add copyright or license headers unless specifically requested.
        - You do not need to \`git commit\` your changes; this will be done automatically for you.
        - If there is a .pre-commit-config.yaml, use \`pre-commit run --files ...\` to check that your changes pass the pre-commit checks. However, do not fix pre-existing errors on lines you didn't touch.
            - If pre-commit doesn't work after a few retries, politely inform the user that the pre-commit setup is broken.
        - Once you finish coding, you must
            - Remove all inline comments you added as much as possible, even if they look normal. Check using \`git diff\`. Inline comments must be generally avoided, unless active maintainers of the repo, after long careful study of the code and the issue, will still misinterpret the code without the comments.
            - Check if you accidentally add copyright or license headers. If so, remove them.
            - Try to run pre-commit if it is available.
            - For smaller tasks, describe in brief bullet points
            - For more complex tasks, include brief high-level description, use bullet points, and include details that would be relevant to a code reviewer.
- If completing the user's task DOES NOT require writing or modifying files (e.g., the user asks a question about the code base):
    - Respond in a friendly tone as a remote teammate, who is knowledgeable, capable and eager to help with coding.
- When your task involves writing or modifying files:
    - Do NOT tell the user to "save the file" or "copy the code into a file" if you already created or modified the file using \`apply_patch\`. Instead, reference the file as already saved.
    - Do NOT show the full contents of large files you have already written, unless the user explicitly asks for them.

${dynamicPrefix}`;
function filterToApiMessages(items) {
    return items.filter((it) => {
        if (it.type === "message" && it.role === "system") {
            return false;
        }
        if (it.type === "reasoning") {
            return false;
        }
        return true;
    });
}
