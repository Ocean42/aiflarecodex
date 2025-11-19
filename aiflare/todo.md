# TODO – Core Parity Focus

Scope reminder: advanced sandboxing, config profiles/trust, special login flows, credential stores, slash-command extras, legacy apply CLI, and backend proxy services are intentionally out of scope (see `NotTodo.md`). This file concentrates on the functionality we **do** need.

## 1. Agent Loop & Execution Quality

- [ ] Align `src/utils/agent/agent-loop.ts` with the Rust agent: resumable streaming, deterministic replay of tool calls, and hardened cancellation so every `function_call` always yields a matching `function_call_output`.
- [ ] Port the PTY-backed, incremental exec loop (Rust `unified_exec`) so shell output streams live into the React UI, supports stdin, and reports duration/exit metadata exactly like `codex-rs`.
- [ ] Ensure command approval UX (`src/components/chat/terminal-chat-command-review.tsx`) surfaces the same reasoning/justification data that the Rust CLI provides before running anything.
- [ ] Harden shell command summarization/error handling so rejected sandbox commands (even when sandboxing is disabled) produce actionable guidance; mirror the retry semantics used in `codex-rs/core/src/tools/handlers/shell.rs`.
- [ ] Introduce `src/utils/HttpManager.ts` as the sole place that issues HTTP requests (OpenAI, backend status, MCP), with structured logging hooks and the ability for integration tests to tap into requests/responses.

## 2. Tool Coverage (Non-Sandbox)

- [ ] Implement the structured `apply_patch` tool flow (freeform + JSON) rather than throwing a stub error. Use Rust’s apply-patch grammar as the contract.
- [ ] Support the `update_plan` tool: parse requests, validate statuses, and surface plan updates in the UI.
- [ ] Implement `view_image` so the agent can attach screenshots for troubleshooting.
- [ ] Flesh out command safety metadata by reusing the `format_exec_output_for_model` logic—metadata about exit status/duration should be serialized just like in `codex-rs/core/src/tools/mod.rs`.

## 3. Session UX Essentials

- [ ] Expand `/status` (or equivalent overlay) to show rate limits, auth mode, working dir, model/provider, token usage, and MCP availability exactly like the Rust TUI status card.
- [ ] Ensure rollouts/history browsing match the behavior of `codex-rs/tui`: users should be able to inspect previous sessions with identical formatting.

## 4. Observability & Notifications

- [ ] Mirror the notifier hook from Rust (`codex-rs/core/src/user_notification.rs`): allow users to configure an arbitrary command that receives JSON payloads on turn completion or approval events.
- [ ] Bring over per-turn timing summaries (thinking time, duration per tool call) and expose them in the React UI/log output so diagnostics stay on par.
- [ ] Adopt the update-check behavior from `codex-rs/tui/src/update_action.rs`, giving users identical messaging about new releases and the `codex update` command.
- [ ] Ensure `HttpManager` logs every request/response (URL, headers, payload, latency, status) so troubleshooting and audits match the Rust CLI expectations.

## 5. Testing & Release Confidence

- [ ] Add Vitest/Playwright coverage for the agent loop, MCP handler stubs, apply_patch flow, and command reviews so regression surfaces mirror the Rust test suites.
- [ ] Introduce end-to-end agent loop tests that run against the real OpenAI Responses API (no mocks), reuse the same login/auth path as the CLI, and assert both the HTTP request payloads and responses captured by `HttpManager`.
- [ ] Align the packaging flow (`scripts/stage_release.sh`) with the Rust release steps so we can confidently ship builds that include the React-based CLI with all required binaries/artifacts.
