# Current Status Summary

## Architecture
- Backend (Express) keeps in-memory maps for CLIs, sessions, and action queue; exposes REST endpoints for pairing, sessions, actions, and session history.
- CLI worker stores config/token locally, registers with the backend, sends heartbeats, polls for actions, logs `noop`/`run_command` payloads, and acknowledges them.
- Frontend (React/Vite) shows CLIs, sessions with status badges, pending actions, and session history; provides buttons to pair CLIs, create sessions, and enqueue sample actions.
- Shared types live in `protocol` package (compiled with typings), consumed by backend/CLI/frontend.

## Manual Workflow
1. Run backend (`npm run dev:backend`), CLI worker (`npm run dev:cli`), and frontend (`npm run dev:frontend`).
2. In the UI, click `Pair new CLI`, then fill the Session form and click `Create Session`.
3. Observe: backend enqueues a default `noop` + `run_command`; CLI logs structured entries and acknowledges; Session History shows `created → action_enqueued → action_acknowledged`.
4. Use `Enqueue Sample Action` to trigger additional cycles. Pending actions list and history update accordingly.

## Next Steps
- Implement real action execution (run command placeholder → actual execution) and integrate session-state transitions with backend.
- Run unit tests regularly (`npm run test:unit` runs backend + CLI suites) and expand coverage (session routes, ConfigStore edge cases).
- Once action flow stabilizes, follow `testPlan.md` for Playwright-based end-to-end tests.
