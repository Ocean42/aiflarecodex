# todoTests – Phase 1 (React/Ink Integration)

Focus: end-to-end UI tests that drive the real AgentLoop (live credentials, no mocks) to prove the CLI behaves like the Rust TUI. Skip history/sessions for now.

## Scenario A – Normal Chat Turn
- **Goal:** TerminalChat accepts a prompt, AgentLoop streams a real reply, Ink renders the assistant output and completion summary.
- **TS files involved:** `src/components/chat/terminal-chat.tsx`, `src/utils/agent/agent-loop.ts`, `src/utils/http-manager.ts`.
- **Tests to create (Vitest/Ink):**
  - Mount `<App>` with default config, type a short prompt (“Sag ‘ja, bin da’”) and assert an assistant message arrives (mirrors existing `tests/agent-live-chat.integration.test.ts` but from the UI path).
  - Capture `httpManager` events to ensure at least one `/responses` POST occurs, verifying identical payload to the backend status test.

## Scenario B – Chat Turn that Updates a Plan
- **Goal:** UI renders a plan update message. Triggered via the test-only `/plan-test` command (which simulates an `update_plan` tool output) to avoid relying on model behaviour.
- **TS files involved:** `src/utils/agent/plan-utils.ts`, `src/utils/agent/agent-loop.ts`, `src/components/chat/terminal-chat.tsx`.
- **Tests to create:**
  - Seed a prompt/instructions that force the agent to produce a plan (e.g., “please outline steps before coding”). Assert the plan overlay message appears, no errors thrown, and plan items/IDs match the JSON emitted by the tool call.
  - Verify the Ink transcript includes both the plan update and the subsequent normal assistant text.

## Scenario C – `/status` Overlay
- **Goal:** `/status` slash command displays rate limits/auth/model info from the real backend call (`src/backend/status.ts` → `BackendCredentials` → `BackendClient`).
- **TS files involved:** `src/components/chat/terminal-chat.tsx`, `src/backend/status.ts`, `src/backend/backend-credentials.ts`.
- **Tests to create:**
  - Type `/status` via TerminalChatInput and assert the overlay shows plan type, primary/secondary windows, and auth mode (“ChatGPT via ~/.codey/auth.json”).
  - Ensure the test asserts on the actual HTTP call (via `httpManager`) so it fails if we regress to a mock or skip.

---

Once these three scenarios pass (with real credentials), we can expand to additional behaviours. History/sessions overlays remain out of scope until we deliberately add them back.

## Phase 1 – Zusatzpunkte (nach den drei Pflichtszenarien)

- **Command approvals (UI + AgentLoop):** simulate a tool call requiring approval, assert the React command review renders and `onCommandApproval` is triggered once the user consents.
- **apply_patch tool flow:** run a simple patch through the UI (Agent emits `apply_patch`, file is updated, Ink shows success + metadata). Mirrors `src/utils/agent/apply-patch-tool.ts`.
- **Token usage panel:** after Scenario A, add a follow-up test that inspects `AgentLoop.getLastTokenUsage()` and ensures the TUI prints the input/output token counts.
- **Notifier hook:** once `src/utils/turn-notifier.ts` lands, register a dummy `notifyCommand` and confirm the external command runs after each completed turn (no mocks; check real filesystem output or process spawn).
- **Regression CLI:** un-skip `tests/cli-ui-codex.integration.test.tsx` to cover the whole App ink tree (enter prompt – see reply) similar to the Rust regression suite.
- **File/tag suggestions:** re-enable the skipped file-tag test by creating a deterministic temp directory and ensuring `@` autocompletion shows real entries.
- **Slash commands `/clear`, `/diff`:** add UI tests verifying those commands manipulate the transcript exactly wie der Rust CLI once die Funktionalität in TS wired ist.

---

# Phase 2 – Core Parity Test Matrix

## 1. Credentials & Login Parity
- **Backend credentials enforcement** (`src/backend/backend-credentials.ts`, `src/utils/codexHome.ts`): add tests that log in via `~/.codey`, confirm `ensure()` logs the resolved path, sets env vars, und hard-fails on malformed files. Mirrors Rust `login/tests/suite/login_server_e2e.rs`.
- **CLI login bootstrap** (`src/cli.tsx`): sobald ein vereinfachter Login-Fluss existiert, Tests hinzufügen, die Config/Instructions-Bootstrap und Fehlermeldungen prüfen. Keine Workspace-Zwangslogik mehr.
- **Auth status overlays** (`src/components/chat/terminal-chat.tsx`): erweitere `/status` um Assertions für Auth-Modus, Tokenpräsenz und Planinfo – identisch zur Rust TUI.

## 2. AgentLoop & Tool Runtime
- **Streaming payloads** (`src/utils/agent/agent-loop.ts`, `src/utils/http-manager.ts`): prüfe die HTTP Bodies auf korrektes `previous_response_id`, `disableResponseStorage`, Plan-Events – analog zu `codex_message_processor_flow.rs`.
- **Token usage & rate limits**: nach jedem Run `AgentLoop.getLastTokenUsage()` und die `/wham/usage`-Antwort vergleichen; Referenz: `app-server/tests/suite/v2/rate_limits.rs`.
- **Function tools** (`apply_patch`, `update_plan`, `view_image`): End-to-End Tests, die echte Dateien patchen oder Pläne aktualisieren und den UI-Output verifizieren.
- **Shell exec PTY** (`src/utils/agent/exec.ts`): Tests für Cancellation/Abort-Metadaten, stdin piping und Timeout, analog `test_shell_command_interruption` in Rust.

## 3. HttpManager Observability
- **Request logging** (`src/utils/http-manager.ts`): füge Tests hinzu, die listener registrieren und Codex-Header + Timing je API Call prüfen.
- **Backend status parity** (`src/backend/status.ts`): Backend-Status-Test erweitern, sodass Rate-Limit-Snapshots exakt den TUI-Anzeigen entsprechen.

## 4. React/Ink Enhancements
- **Command approvals UI** (`src/components/chat/terminal-chat-command-review.tsx`): Tests für Wartezustand, Approve/Reject-Aktionen und resultierende `onCommandApproval` Events.
- **Notifier UX** (`src/utils/turn-notifier.ts`): sobald implementiert, End-to-End Test schreiben, der einen Dummy-Notifier triggert und dessen Output prüft.
- **Plan overlay refinements**: Mehrere `update_plan`-Events innerhalb eines Turns testen, damit das UI doppelte Items dedupliziert und die finale Liste korrekt darstellt.
- **Slash commands Erweiterungen**: Wenn weitere Kommandos (z. B. `/bug`, `/help`) erweitert werden, entsprechende UI-Tests ergänzen.
