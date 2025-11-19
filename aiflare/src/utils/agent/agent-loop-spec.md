# AgentLoop Baseline (Stage 0 Snapshot)

This document freezes the TypeScript agent loop surface area before the parity refactor. Every subsequent stage must keep these contracts working until they are explicitly superseded.

## Constructor Parameters

`new AgentLoop(params: AgentLoopParams)` currently expects:

- `model: string` – OpenAI model identifier (e.g. `gpt-5.1-codex`).
- `provider?: string` – provider name (`openai`, `azure`, etc.).
- `config: AppConfig` – resolved CLI configuration (timeouts, sandbox, flex mode).
- `instructions?: string` – optional system prompt loaded from config.
- `approvalPolicy: ApprovalPolicy` – governs auto-approval vs manual prompts.
- `label?: string` – optional tag used in logs and telemetry.
- `disableResponseStorage?: boolean` – when true we stream the entire transcript on every turn.
- `additionalWritableRoots: ReadonlyArray<string>` – extra paths whitelisted for sandbox exec.
- `onItem(item: AgentResponseItem)` – called whenever a new agent/exec/plan event is ready for the UI.
- `onLoading(loading: boolean)` – toggled when the model is thinking or idle.
- `getCommandConfirmation(command, applyPatch)` – async hook to prompt the user before running commands.
- `onLastResponseId(id: string)` – stores the previous response id for the next turn.
- `onCommandApproval?(event)` – optional telemetry about approvals/denials.

## Methods

- `run(input: ResponseInputItem[], previousResponseId?: string)`  
  Starts a new turn. Handles streaming events, tool routing, and emits `AgentResponseItem`s via `onItem`.

- `cancel()`  
  Aborts the active OpenAI stream and any running shell tools. Used when the user presses ESC.

- `terminate()`  
  Hard-stops the loop instance. After this call no further `run()` operations are allowed.

- `setCommandApprovalHandler?(handler)` – _not exposed; approval flow is supplied via constructor_.

## Event Surface

`onItem` receives either native response items (OpenAI `ResponseItem`s) or agent-generated events defined in `agent-events.ts`:

- `PlanUpdateEvent` – emitted when the `update_plan` tool commits a change.
- `ExecEventItem` – `begin`/`end` lifecycle notifications for commands.
- `ReasoningSummaryDeltaEvent` / `ReasoningContentDeltaEvent` / `ReasoningSectionBreakEvent` – incremental reasoning output mirrored from Rust.

All other UI layers (history overlay, rollouts, notifier) rely exclusively on this `AgentResponseItem` union.

## Tool Support (Stage 0)

The CLI registers the following built-in function tools with OpenAI:

- `shell` / `container.exec` – run commands through `handleExecCommand`.
- `apply_patch` – apply Codex patches locally.
- `update_plan` – update the task plan overlay.
- `view_image` – attach a local screenshot to the turn.
- `list_mcp_resources`, `list_mcp_resource_templates`, `read_mcp_resource` – currently stubbed and return “not implemented”.

3rd-party tools (MCP) are **not** wired up in Stage 0.

## Streaming + Transcript Behavior

- All turns use the OpenAI `/responses` SSE endpoint; there is no longer a chat-completions fallback.  
- When `disableResponseStorage` is true, the loop maintains its own transcript and replays it on every turn.  
- `pendingAborts` tracks unfinished tool calls so the next turn can inject a synthetic `function_call_output` and avoid API errors.

The rest of this refactor plan treats this document as the baseline to validate regressions against.
