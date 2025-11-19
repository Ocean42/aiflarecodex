# NotTodo – Explicitly Deferred Scope

These items are intentionally **out of scope** for the current parity push. They may return later, but do not spend cycles on them now.

- Full sandbox parity (Seatbelt/Landlock/Windows restricted token, approval presets, sandbox diagnostics, standalone `codex sandbox` helpers).
- Advanced config/profile plumbing (managed TOML overlays, trust management, per-project profiles, shell environment whitelists).
- Extra auth flows (device-code login, credential-store selection, OAuth keychain integration, MCP OAuth storage).
- Slash-command breadth and UX chrome beyond `/status`, `/diff`, and `/review`.
- `codex apply` CLI, legacy responses API proxy, `app-server`, `cloud-tasks`, or other backend/batch services.
- Release tooling that bundles Rust binaries with the React CLI, aside from the minimal staging we already do.
- Network sandboxing approvals, browser-based login refinements, or any credential persistence beyond the existing `auth.json`.
- MCP client/server work (connection manager, remote tool listings, MCP server entrypoint).
