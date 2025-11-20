# Umsetzungsplan „Backend AgentLoop Restore“

## Ausgangspunkt
- `backend/tests/*.test.ts` beschreiben die komplette Zielarchitektur (SessionStore, ActiveSessionRegistry, SessionRunner, ToolExecutorFactory, ToolResultBroker). Durch den gelöschten `src/services`-Code schlagen alle Tests fehl, obwohl die Spezifikation in `plan/newPlanDetail.md` erhalten blieb.
- Im Ordner `aiflare/` existiert die funktionierende Legacy-Implementierung (AgentLoop, Tool-Runtime, Session-Utilities usw.). Diese Codebasis muss modular entnommen und ins Backend portiert werden, sodass Tools über den Remote-CLI-Worker laufen können.
- CLI-Worker, Frontend und Protokoll-Pakete sind noch intakt; das Backend braucht jedoch neue Services plus REST-Routen, damit Playwright später wieder echte Sessions („Hallo“-Flow) testen kann.

## Ziele (Kurzfassung)
1. Backend-Domäne samt Persistenz (`SessionStore`, `SessionState`, Registry) rekonstruieren.
2. SessionRunner & AgentLoop mit Tool-Bridge (CLI Executor) einbinden.
3. REST-/Action-Flow an neue Services adaptieren und Tests wieder grün bekommen.
4. Basis schaffen, damit Frontend/Playwright auf SessionWindow + Deltas aufbauen kann.

## Arbeitspakete

### 1. Domain & Persistenz
1. Portiere `SessionStore`/`SessionState` aus Legacy (`aiflare/src/utils/session.ts` + verwandte Utils). Speicherort: `backend/src/services/sessionStore.ts`. Features gemäß Tests:
   - Transcript + Events + Status pro Session.
   - File-Checkpoint in `backend/tmp/sessions/<id>.json`.
   - Observable `subscribe` API (+ Tests `sessionStore.test.ts`).
2. Implementiere `ActiveSessionRegistry` (`backend/src/services/activeSessionRegistry.ts`):
   - Map Kontext → SessionId, Listener-API, `listContexts`.
   - Unit-Tests (bereits vorhanden) sollen direkt gegen neue Datei laufen.
3. Ergänze `SessionState`-Hilfstypen (Message/Event-Schemas), Export für Runner & BackendApp.

### 2. AgentLoop & Runner
1. Erstelle `backend/src/services/sessionAgent.ts`:
   - Wrapper um Legacy-AgentLogik (`aiflare/src/utils/agent/...`).
   - Lädt AppConfig/PromptTemplates analog `aiflare/src/cli.tsx`.
   - Kapselt `SessionAgentService` (Legacy) + `createLegacyRuntimeFactory`.
2. Schreibe `backend/src/services/sessionRunner.ts`:
   - Verwaltet Queue pro Session, ruft AgentLoop, streamt Items in `SessionStore`.
   - Nutzt ToolExecutor-Interface für function calls (siehe Abschnitt 3).
   - Implementiert Statuswechsel (`waiting|running|streaming|error`) und Reply-Rückgabe (für Tests `sessionRunner.test.ts`).
   - Baut auf Legacy `AgentLoop` (import aus `@aiflare/...` oder monorepo-Pfad) und injiziert Hooks (`onItem`, `onLoading`, `onToolCallPending`, ...).
3. Stelle Utility `backend/src/utils/agent/runtime.ts` bereit:
   - Re-exportiert/konfiguriert `AgentLoop` aus Legacy (z. B. `createLegacyRuntimeFactory`).
   - Achtet auf Workdir, Model, Credentials (AuthState/ENV).
4. Tests `sessionRunner.test.ts` müssen den Legacy-Responder nutzen (Hallo/sessId) → falls Legacy-Files zusätzliche Mocks brauchen, minimale Stub-Implementationen beilegen.

### 3. Tool-Bridge & CLI-Interaktion
1. `ToolResultBroker`: Promise-Resolver-Map mit Timeout (Tests vorhanden).
2. `toolExecutorFactory.ts`:
   - Definiert Interface `ToolExecutor`.
   - `mode: "cli"` erstellt Executor, das Actions via `BackendApp.enqueueAction` oder besser `enqueueToolCall` Callback sendet.
   - Wartet über `ToolResultBroker` auf `backendClient.submitToolResult`.
3. BackendApp:
   - Neue Route `POST /api/sessions/:id/messages` legt Message ab, triggert Runner.
   - Endpoint `POST /api/sessions/:id/tool-results` (vom CLI-Worker aufgerufen) piped Outputs → `ToolResultBroker.resolve`.
   - Action-Queue erweitert um `agent_tool_call` Payloads (enthält `invocation`, `sessionId`, `workdir`).
4. CLI-Worker ist bereits vorbereitet (`handleAgentToolAction`); Backend muss nur `agent_tool_call` generieren und `submitToolResult` Endpoint bedienen.

### 4. Integrationen & UI-Hooks
1. Session-/CLI-REST-Antworten auf neue Store-Daten stützen (`GET /api/sessions`, `/api/sessions/:id/transcript`, `/api/sessions/:id/history`).
2. ActiveSessionRegistry mit REST koppeln (`/api/active-session` Endpoints), sodass Frontend `appState` updaten kann (Vorarbeit für `SessionWindow`).
3. Deltas/SSE vorbereiten laut `newPlanDetail` Abschnitt 3 (initial Polling, SSE optional).

### 5. Qualitätssicherung
1. Lokale Checks:
   - `npm --workspace aiflareCliBackendHtml5/backend run build`
   - `npm --workspace aiflareCliBackendHtml5/backend run test:unit`
   - `npm --workspace aiflareCliBackendHtml5/cli-worker run test:unit` (falls vorhanden)
   - Root `npm run build` als Smoke-Test bevor Playwright.
2. Später: `npm run e2e` sobald Frontend/SessionWindow ausgebaut ist; Tests `chat-basic.spec.ts` und `multi-session-context.spec.ts` müssen AgentLoop-Fluss prüfen.

## Ressourcen / Referenzen
- Legacy AgentLoop: `aiflare/src/utils/agent/*`, Config in `aiflare/src/utils/config.ts`, CLI Entry `aiflare/src/cli.tsx`.
- Tool-Broker Inspiration: `aiflare/src/utils/agent/tool-router.ts` + CLI Worker `backendClient.submitToolResult`.
- Planvorgaben: `plan/newPlan.md` + `plan/newPlanDetail.md`.

> Reihenfolge ist bewusst so gewählt, dass nach Paket 3 wieder Vitest läuft, bevor UI/Playwright angefasst wird.
