
# Agent Loop Refactor Plan (TS Parity with Rust)

Goal: port the Rust agent loop architecture (tool router + event processor + stream handling + MCP plumbing) into the TypeScript CLI so that both implementations share the same behavior and contracts.

## 1. Scope Recon
- [ ] Audit Rust components:
  - `codex-rs/core/src/codex.rs` (agent loop orchestration)
  - `core/src/tools/router.rs`, `tools/handlers/*`
  - `core/src/tools/events.rs`, `event_mapping.rs`
  - `core/src/mcp/*` hooks
- [ ] Map each Rust capability to a TS module (tool router, event runtime, unified exec, MCP bridging, notifier, reasoning stream, history/rollout, approvals).

## 2. Core Architecture in TS
- [ ] Create TS `ToolRouter` (+ registry + handler contracts) mirroring Rust:
  - parse `function_call`/`local_shell_call`
  - dispatch to standard handlers + MCP handlers
- [ ] Implement `ToolRuntime` that owns InFlight tool calls and integrates with streaming responses:
  - convert SSE events into tool invocations
  - stream reasoning/text deltas similar to Rust
- [ ] Introduce TS equivalents for:
  - `ToolInvocation`, `ToolOutput`, `ToolPayload`
  - event structs (exec begin/end, reasoning deltas, plan updates, etc.)

## 3. Stream & Event Pipeline
- [ ] Replace current `processEventsWithoutStreaming` fallback with full SSE loop:
  - decode `response.output_item.*` events
  - keep track of active `call_id`s
  - guarantee each `function_call_output` is paired with a real `function_call`
- [ ] Mirror Rust’s retry/backoff logic, notifier hooks, rate limit updates.
- [ ] Adopt the reasoning delta handling that Rust exposes (`ReasoningContentDeltaEvent`, `AgentReasoning*`).

## 4. Tool Handlers & MCP Integration
- [ ] Port core handlers: shell/unified_exec, apply_patch, plan, view_image, MCP tool proxy.
- [ ] Share approval plumbing (`canAutoApprove`, sandbox policy) across both implementations.
- [ ] Hook MCP connection manager + OAuth the same way as Rust’s `McpConnectionManager`.

## 5. UI / CLI Integration
- [ ] Update Ink components to consume the new event stream (already partially done).
- [ ] Ensure slash commands, history overlay, rollouts all store `AgentResponseItem`s.
- [ ] Align notifier + telemetry behavior with Rust (per-turn metrics, exec metadata, plan updates).

## 6. Testing & Validation
- **Integration tests (highest priority)**  
  For each tool/feature, add an Ink-based live test that issues a *natural instruction* (no slash command) and verifies:
  - expected assistant output appears (e.g. contains file contents, plan text, exec summaries);
  - no warnings/errors like `⚠️ OpenAI rejected...` are shown.
  - toolcall metadata: cwd, exit code, reasoning chunk.
  Specific scenarios:
  1. **File inspection** – prompt “Schau dir README.md an...” and assert the output shows the file content, zero errors.
  2. **Plan management** – request a plan (“Erstelle einen Plan mit…”) and verify plan tool events render with correct statuses.
  3. **Exec command** – ask the agent to run `ls` in repo root and check that stdout renders and exit metadata is shown, no warnings.
  4. **apply_patch** – instruct a small patch (“Füge TODO hinzu…”) and assert command stdout includes `command.stdout` with diff, plus no error banners.
  5. **view_image/mcp placeholders** – when available, test that asking for a screenshot (or stub resource) results in the correct message (even if stubbed).
  6. **Unified exec / streaming** – instruct the agent to run a long command so that the incremental exec chunks appear without duplication/warnings.
  7. **MCP tool call** (once ported) – issue “Frag MCP-Server XYZ nach ...” and verify the tool response displays without harness warnings.
  8. **History & rollback** – ask the agent to show previous turn summary to ensure conversation context is maintained (no `function_call_output` contract errors).
- Integration tests should live alongside `tests/terminal-chat-live.integration.test.tsx` (extra `describe` blocks per tool) and use `waitForFrame` to inspect the UI output.
- Regression check: monitor console output for `⚠️` lines; tests should fail if such warnings appear during the scenario.

- **Unit tests (lower priority but still useful)**
  - Router dispatch + handler contracts (Vitest).
  - `uniqueById`, event conversion utilities, config toggles.

## 7. Rollout & Docs
- [ ] Update README/AGENTS.md with new architecture overview.
- [ ] Document config flags (mirroring Rust) for enabling MCP, unified exec, etc.
- [ ] Provide migration notes for contributors (where to add new handlers, how to add tests).
