# Sample Action Workflow

1. Pair a CLI via the frontend (`Pair new CLI`). This calls `/api/clis/pairing` and refreshes the CLI list.
2. Create a session (fill CLI/workdir/model, press `Create Session`). Backend stores the session and enqueues a default `noop` action for its CLI.
3. Press `Enqueue Sample Action` to manually add more actions for testing. The CLI polls `/api/clis/:id/actions`, logs the payload via `handleAction`, and acknowledges the action. `run_command` placeholders show the echoed command; `noop` just prints context.
4. Once the CLI acknowledges, backend removes the action, records `action_acknowledged` in session history, and sets the session back to `waiting`, which appears in the frontend session list/history.
5. Repeat the flow at will; each action cycle exercises backend ↔ CLI ↔ frontend plumbing end to end. Use the Session History panel to confirm `created → action_enqueued → action_acknowledged` events.

All steps run against the real backend/CLI/Frontend stack; no mocks are involved.
