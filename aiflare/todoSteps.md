# TodoSteps – Make Every Test Hit the Real Codex Backend

The current suite still relies on mocks, fake tokens, and FS stubs. Goal: every test that exercises agent ↔ backend behavior must authenticate with the exact same credential loader and talk to the live Codex endpoints. No mock OpenAI clients, no stubbed loggers, no fake FS.

## 0. Guiding Principle – Class-Based Design (Applies to *All* Modules)
- Every subsystem (credentials, HTTP, logging, config, agent loop, CLI UI, slash commands, sandbox/exec, history, etc.) must expose a class-based API with clearly defined responsibilities.
- Files exporting loose helper functions (e.g., `config.ts`, `codexHome.ts`, `slash-commands.ts`, `terminal-chat-input` utilities, sandbox helpers, FS helpers) must be refactored so consumers interact through classes or cohesive objects only.
- Any module that cannot be reshaped cleanly should be rewritten, even if that means new class hierarchies (e.g., `ConfigManager`, `SlashCommandRegistry`, `SandboxRunner`, `HistoryStore`).
- Unit tests must instantiate these classes just like the CLI bootstrap does; no shortcut imports of standalone functions are allowed.

## 1. Unify Credential Loading Everywhere
- Delete `src/backend/auth.ts` and any helper that performs ad-hoc token parsing.
- Introduce a `BackendCredentials` class with `static ensureCredentials(): BackendCredentials` which:
  - Reads the exact same files as a real CLI start (`~/.codey/auth.json` – no overrides).
  - Sets `process.env.OPENAI_API_KEY`, `chatgpt-account-id`, etc. to mirror real runtime state.
  - Throws (hard fail) if `auth.json` is missing, malformed, or contains unusable tokens. No skips, no fallbacks.
- Audit the entire repo for direct env hacks (`OPENAI_API_KEY`, `CHATGPT_BASE_URL`, etc.) and funnel them through `BackendCredentials.ensure()` so there is literally one path for credentials.

## 2. Real Auth Pre-flight for Vitest
- Build a Vitest setup module (`tests/setup-real-auth.ts`) that:
  - Ensures `~/.codey/{auth.json,config.json}` exist before tests run.
  - Prints a clear fatal error if credentials are absent.
  - Ensures history/sessions/log directories exist so live traffic has a place to write.
- Require this setup file via `vitest.config.ts` so *every* test starts with real auth.

## 3. Remove All OpenAI / Logger Mocks
- Purge **all** `vi.mock` usage from the repo (including `package.json` scripts/config). Tests must never stub OpenAI, the logger, FS, etc.
- Import the real SDK everywhere.
- Refactor `tests/token-streaming-performance.test.ts`, `tests/agent-token-usage.test.ts`, etc. to perform actual `AgentLoop.run()` calls and wait for streamed tokens from the backend.
- Extend `src/utils/logger/log.ts` with deterministic log paths under `~/.codey/log/tests`. Tests must read actual log files to assert behavior—no stub loggers.

## 4. Convert Legacy Unit Tests to Live Integration
- Identify tests that currently inspect payloads via spies (disableResponseStorage, approval propagation, rate limits, etc.).
- Replace them with black-box assertions on the real HTTP transcript captured by `httpManager`. Example: run a turn with `disableResponseStorage=true` and examine the recorded POST body to ensure `previous_response_id` is omitted.
- Drop any assertion that depended on fake response IDs; instead, parse actual responses and compare to ground-truth prompts (e.g., expect assistant message contains “ja, bin da”).

## 5. Slash Commands & CLI UI
- For Ink-based tests (`terminal-chat-input`, `/logout`, `/clear`, etc.), spin up a real `App` instance pointing at the live backend. When `/logout` is triggered, the test must verify that `auth.json` actually disappears on disk before restoring it from a snapshot.
- Provide utilities to snapshot and restore `auth.json` / `config.json` around these tests to avoid permanent state loss.

## 6. Regression Suite with Mandatory Live Traffic
- Extend `tests/regression-suite.integration.test.ts` to cover:
  - `/status` panel hitting rate-limit endpoint with real tokens.
  - Agent turn that runs a command and captures approval events from the actual backend streaming responses.
  - Rollout creation/inspection by reading real session files.
- If any of these steps cannot complete (network offline, tokens revoked), the suite should throw with actionable remediation steps instead of skipping.

## 7. CI & Local Developer Experience
- Document required environment variables and `codex --login` flow in `README`.
- Wire GitHub Actions (or internal CI) to inject encrypted `auth.json` + `config.json` so tests have real credentials during automated runs. Failing to decrypt should fail the pipeline loudly.
- Provide a cleanup script that restores pristine auth/config copies after each test run to avoid state drift between runs.

## 8. Verification Gate
- Add a final Vitest suite `tests/live-audit.test.ts` that asserts:
  - No `vi.mock(`openai`)` appears in the compiled code (scan via `rg`).
  - No skipped tests remain (`vitest --run` should report zero skipped).
  - `httpManager` recorded at least one `/responses` POST and one `/wham/usage` GET.
- Blocks merges if live traffic is not observed.
