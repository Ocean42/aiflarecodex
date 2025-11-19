# Agent Loop Parity Checklist

The TypeScript agent loop now shares the streaming skeleton with the Rust implementation, but several gaps remain before they behave identically end‑to‑end. We keep this file as a living checklist of the remaining deltas. (Slash commands are deliberately scoped to the current Ink UI, so no additional ones are planned.)

## Parity status

All previously missing pieces have landed:

- **Tool surface coverage** – `read_file`, `list_dir`, `grep_files`, the MCP tool routers, and the existing shell/patch/plan handlers now mirror the Rust surface so the model no longer has to fall back to ad‑hoc shell commands.
- **Streaming + retry parity** – request/stream retry budgets respect the configured provider defaults, `supports_parallel_tool_calls` is enabled for the same model families as Rust, and reconnect attempts emit the “Reconnecting…” notice while honoring disconnect/rate‑limit backoffs.
- **Approval telemetry** – the confirmation modal shows the cwd, sandbox target (“host” vs sandbox), policy, per‑call IDs, and retry reasons so operators see the same risk context the Rust TUI exposes before approving/denying a command.
- **Queued prompts & resume ergonomics** – prompts submitted while a turn runs are queued, surfaced in the UI, drained automatically once the agent is idle, and restored into the composer if the user interrupts the turn—matching codex-rs’ workflow.

We keep this document to record the items that were historically missing; no further gaps remain aside from deliberately scoped UI differences (slash commands stay Ink‑specific).
