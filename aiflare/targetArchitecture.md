# Target Architecture (React CLI)

## High-Level Overview

```
┌─────────────────────┐
│ CLI entry (`cli.tsx`)│
└─────────┬───────────┘
          │ command/flags
┌─────────▼───────────┐
│ Config + session init│
└─────────┬───────────┘
          │ AppConfig, prompt, images
┌─────────▼───────────┐            ┌───────────────────┐
│ React Ink shell (App)│◄──────────┤ Storage (history, │
│  • TerminalChat       │  rollouts │ rollouts, logs)   │
└─────────┬───────────┘            └───────────────────┘
          │ AgentLoop API
┌─────────▼───────────┐
│ AgentLoop            │
│  • Command planner   │
│  • Tool invocation   │
│  • Streaming handler │
└─────────┬───────────┘
          │ HTTP requests via HttpManager
┌─────────▼───────────┐
│ HttpManager          │
│  • Centralized fetch │
│  • Logging hooks     │
│  • Test interception │
└─────────┬───────────┘
          │ Tool calls / API calls
┌─────────▼───────────┐
│ Tool Runtime Layer  │
│  • Shell exec (PTY) │
│  • apply_patch      │
│  • update_plan      │
│  • view_image       │
│  • MCP client/server│
└─────────┬───────────┘
          │ OpenAI Responses API / MCP transports
```

## Key Components

### CLI Entry (`src/cli.tsx`)
- Parses the same top-level flags/subcommands as the Rust CLI (minus the `NotTodo` exclusions).
- Boots configuration (env + simple config file), handles login/rollout viewing, then mounts the React Ink app.

### React Ink Shell (`src/app.tsx`, `components/chat/*`)
- Owns user input, approvals UI, overlays (`/status`, `/diff`, `/review`), history browsing, and rollouts.
- Talks to `AgentLoop` via callbacks (`onItem`, `onLoading`, `getCommandConfirmation`, etc.).
- Streams stdout/stderr efficiently by consuming incremental agent events rather than blocking until completion.

### AgentLoop (`src/utils/agent/agent-loop.ts`)
- Central orchestrator: builds OpenAI Responses requests, multiplexes streaming events, and invokes tools.
- Guarantees every `function_call` yields a matching `function_call_output`, tracks pending aborts, and normalizes chat vs. responses payloads.
- Handles retries/backoff, reasoning metadata, and plan updates.
- Provides hooks for the UI to inspect token usage, reasoning summaries, and MCP/startup status.
- All outbound HTTP calls (OpenAI, MCP transports, backend status) route through `HttpManager`, enabling uniform logging, instrumentation, and test capture.

### HttpManager (`src/utils/HttpManager.ts`)
- Thin abstraction over `fetch`/HTTP clients that:
  - Injects auth headers, timeouts, retry policy, and structured logging.
  - Emits request/response events that integration tests can capture to verify exact payloads (no mocks; tests run against real OpenAI endpoints using the same credentials as the CLI).
  - Allows opt-in hooks (e.g., transcripts, debugging) without littering the AgentLoop with logging concerns.
  - Supports “tap” mode in tests so we can assert on raw HTTP traffic while still executing real calls.

### Tool Runtime Layer
- **Shell exec** (`src/utils/agent/exec.ts`): PTY-backed process runner with live output streaming, stdin piping, precise timeout/error metadata, and approval gating.
- **apply_patch** (`src/utils/agent/apply-patch.ts` + exec helpers): Parses patches using the Rust grammar, reads/writes files safely, and reports results back to the agent.
- **update_plan**: Validates JSON payloads and emits structured plan events for the UI.
- **view_image**: Reads local image files and attaches them to the active turn context.
- **MCP client**: Maintains connections to configured MCP servers, lists tools/resources, dispatches tool calls, and surfaces progress/errors. Uses a shared connection manager to avoid redundant processes.
- **MCP server**: Optional entrypoint exposing Codex tools (shell/apply_patch/etc.) so external agents can leverage this CLI.

### Storage & Persistence
- Rollouts, command history, and logs live under `~/.codey/…` (same layout as the legacy CLI).
- Rollout loader feeds `/history` and `/sessions` overlays with the same schema `codex-rs` produces.

## Control Flow

1. **Startup**: `cli.tsx` parses args → `App` loads config/prompts → `AgentLoop` instantiated.
2. **User submits prompt**: UI converts text/images into `ResponseInputItem`s and calls `agent.run()`.
3. **AgentLoop** posts to OpenAI Responses API, streaming events back to the UI. Tool calls trigger the Tool Runtime layer which returns outputs + metadata.
4. **Approvals**: when `handleExecCommand` needs confirmation, UI displays modal; user choice feeds back into the loop.
5. **Outputs**: items (assistant messages, diffs, plan updates, MCP results) flow into the React message history; rollouts saved after each turn.
6. **Notifications**: configurable notifier command runs after each completed turn or approval to keep OS-level alerts parity.

## Design Principles

- **Deterministic execution**: every tool call is idempotent and emits metadata so we can resume/replay sessions reliably.
- **First-class streaming**: PTY exec + streaming responses minimize latency and mirror the Rust UX.
- **Clear separation**: CLI/UI/Agent/Tools layers communicate via typed payloads so the agent loop can be reused (e.g., for non-interactive exec) without UI code.
- **Extensible tooling**: by implementing apply_patch, update_plan, view_image, and MCP endpoints centrally, future tools plug into the same registry without UI churn.
- **Observable HTTP surface**: every request/response is captured through `HttpManager`, logged, and verifiable in tests to guarantee the CLI speaks the same wire protocol as the production Rust CLI.
