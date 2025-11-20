# Overview
- Wir klonen die bestehende `aiflare`-Implementierung (TypeScript-CLI, Ink-UI, AgentLoop, Tooling) logisch in drei voneinander entkoppelte Artefakte: ein **extrem „dummes“ CLI-Worker-Binary**, ein zustandsorientiertes Backend (Server + AgentLoop + Session- und Tool-Orchestrierung) sowie ein HTML5-Frontend, das mehrere Sessions gleichzeitig beobachten und steuern kann.
- Schlüsselprinzip: **AgentLoop und Tools laufen ausschließlich im Backend**; das CLI ist auf die Rolle eines lokalen Action-Ausführers reduziert. Es empfängt ausschließlich Aufträge, führt sie aus, zeigt minimal im Terminal an, was gerade passiert, und sendet Ergebnisse zurück. Es gibt keinerlei Interaktionen oder Eingaben im CLI (nach dem allerersten Link-Vorgang), keine Prompts, keine Approvals – alles läuft über Backend & Frontend.
- Sämtliche Kommunikation ist ereignisgetrieben: Backend verwaltet einen konsistenten Session-State, streamt Deltas sowohl an das CLI (ActionQueue) als auch an das Frontend (UI-Deltas), besitzt einen Recovery-Mechanismus bei CLI-Disconnects und persistiert alles (Sessions Root, Logs) analog zur heutigen `~/.codey`-Struktur.
- **Auth-UX**: Die Authentifizierung (OpenAI/Codex Login) läuft ausschließlich über das Backend. Fehlt ein gültiger Token, zeigt das HTML5-Frontend deutlich ein Login-Banner inkl. vom Backend erzeugtem OAuth/Login-Link an. Nach erfolgreicher Authentifizierung speichert das Backend die Credentials (z. B. wie `auth.json`) zentral und verteilt nur den Status an CLI/Frontend.
- Tests sind reine End-to-End-/Integrationstests mit Playwright: Für jeden Test wird ein echtes Backend gestartet, ein echtes CLI-Worker-Binary gespawnt, das HTML5-Frontend per Vite/Dev-Server oder statisch bedient und dann das UI automatisiert, um Multi-Session-Flows sowie Disconnect/Reconnect-Szenarien zu verifizieren.

---

# Detailplan

## 0. Ist-Analyse & Reuse-Strategie
1. **CLI-Entry & UI (aiflare/src/cli.tsx, app.tsx, components/chat/**)**: Die Ink-Komponenten orchestrieren aktuell Session-Lifecycle, Rendern, Eingaben etc. Für die Neuaufteilung extrahieren wir lediglich minimale Helpers (z. B. `loadConfig`, `getAuthFilePath`, `TerminalChatSession`-Definition in `src/utils/session.ts`) und verteilen sie direkt in CLI oder Backend. Es gibt kein generisches „shared“ Paket mehr – jede Komponente besitzt ihren dedizierten Code.
2. **AgentLoop & Tools (src/utils/agent/**)**: Alles rund um `AgentLoop`, `handleExecCommand`, `tool-router`, `tool-runtime`, MCP-Integration, `apply_patch` usw. wandert komplett ins Backend. Der Backend-Service kapselt die Aufrufe auf `createResponsesRequest` (`src/backend/modelClient.ts`) und das Event-Mapping (`src/backend/responseEvents.ts`).
3. **Backend-Hilfen (src/backend/**)**: Auth, RateLimit-Client, Prompt-Building (`prompt.ts`), ResponseEvents usw. werden nahezu unverändert im Backend-Package genutzt. Wir entfernen aus dem CLI jegliche direkte Backend-/OpenAI-Aufrufe.
4. **Config & Storage (`src/utils/config.ts`, `codexHome.ts`, `storage/` etc.)**: CLI und Backend besitzen jeweils eigene, auf das Minimum reduzierte Helfer. Es gibt nur eine klar definierte Protokoll-Ebene („protocol“), die beschreibt, wie Backend und Frontend kommunizieren (REST/SSE/WebSocket-Events). Alles andere wird lokal pro Komponente gehalten.
5. **Terminal-spezifische Dinge (`ink`, `TerminalChatInput`, `terminal.ts`)**: verbleiben ausschließlich im CLI-Worker, aber nur soweit sie zum Anzeigen von Logs/Fehlern nötig sind. Interaktive Chat-UI entfällt.

## 1. Monorepo-Struktur & Build-System
1. Erstellen eines einfachen Monorepos (ohne pnpm) mit drei Paketen, gesteuert über klassische npm-Skripte:
   - `packages/protocol`: Enthält ausschließlich die Typdefinitionen + Event-/REST-Spezifikation zwischen Backend und Frontend (z. B. `SessionState`, `CliDescriptor`, `FrontendDelta`, `FrontendCommand`). CLI nutzt lediglich einen kleinen Abschnitt (nur `BackendToCliAction` / `CliToBackendEvent`). Keine sonstigen Utilities.
   - `packages/backend`: Node.js/Express (bereits Dependency in `aiflare/package.json`) Service, bundelt `AgentLoop`, Tool-Orchestrierung, Sessionspeicher, HTTP + WebSocket API.
   - `packages/cli-worker`: Node.js CLI, minimaler Ink-Einsatz (nur CLI-Output), stellt lokale Tool-Runner (`handleExecCommand`, `runApplyPatchTool`, `mcp` etc.) bereit und konsumiert Backend-Actions.
   - `packages/web`: Vite/React-App (HTML5-Frontend) mit WebSocket-Client für Session-Deltas, UI für CLI-Übersicht, Session-Liste, Chat/Plan/Tool-Protokoll.
2. Gemeinsame TypeScript-Konfigurationen (base tsconfig in Repo-Root). CLI und Backend bleiben Node-target (ES2022), Web bundelt via Vite.
3. `package.json` im Root koordiniert Builds via npm-Skripte (`npm run dev:backend`, `npm run dev:cli`, `npm run dev:web`). Ein kleines Node-Skript (`scripts/dev-all.js`) startet Backend, CLI-Worker-Mock und Frontend simultan (nützlich auch für Tests).

## 2. Protocol-Package (REST/WebSocket contracts)
1. **Types & IDs**
   - `CliId`, `SessionId`, `FrontendClientId`.
   - `CliDescriptor` (id, hostname, platform, connectedAt, lastSeen, capabilities).
   - `SessionState`: Aus `TerminalChatSession` plus laufender Turn-State, Items (Array von `AgentResponseItem`), Tool-Status, Plan, RateLimit-Snapshot etc.
2. **Event-Protokolle**
   - `BackendToCliAction`: `RunCommand`, `ApplyPatch`, `ListDir`, `ReadFile`, `McpCall`, `UpdateSettings`.
   - `CliToBackendEvent`: `ActionResult`, `ActionErrored`, `Heartbeat`, `Log`.
   - `BackendToFrontendDelta`: `cliListUpdated`, `sessionSummaryUpdated`, `sessionItemAppended`, `sessionStatusChanged`, `sessionPlanDelta`, `sessionDisconnected`, `sessionReconnected`, `rateLimitUpdated`.
   - `FrontendToBackendCommand`: `createSession`, `enqueuePrompt`, `approveCommand`, `rejectCommand`, `setApprovalMode`, `selectCli`.
3. **Config Helpers**
   - Nur noch so viel wie unbedingt nötig wird im jeweiligen Paket gehalten. Wo gemeinsame Typen nötig sind, liegen sie als reine TypeScript-Typen im Protocol-Package. Es gibt keine zentralen Utility-Funktionen, die Logik über Komponenten hinweg teilen.
4. **Session Storage Utilities**
   - Reuse aus `src/utils/storage` (`saveRollout`, `loadRollout`, `getSessionsRoot`), aber so refaktorieren, dass Backend die Einträge verwaltet.
5. **Tool Runner Interfaces**
   - Exportiere `HandleExecCommandArgs`, `CommandApprovalContext`, `SandboxType`, `ToolInvocation`, `ToolHandler`.
   - CLI implementiert lokale Tools, Backend ruft über WebSocket ab.

## 3. Backend-Service
### 3.1 Infrastruktur
1. Express + WebSocket (ws) Server.
2. Endpunkte:
   - `POST /api/cli/register`: CLI meldet sich mit persistent ID (aus Shared-Config), bekommt Auth-Token/WebSocket-URL.
   - `GET /api/sessions`: Liste Sessions + Status (inkl. CLI-Bindungen).
   - `POST /api/sessions`: Neue Session für ausgewählten CLI (Parameter: cliId, initialPrompt, config overrides).
   - `POST /api/sessions/:id/prompt`: Neue User-Prompt.
   - `POST /api/sessions/:id/approval`: Approve/Deny `RunCommand`.
   - `POST /api/auth/login-link`: Generiert Codex-Login-Link, speichert Nonce/State.
   - `POST /api/auth/callback`: Backend erhält Token, persistiert wie heutiges `auth.json`.
   - `GET /api/auth/status`: Frontend prüft, ob gültige Credentials vorliegen.
   - `GET /api/deltas/stream`: SSE/WebSocket für Frontend-Deltas.
3. WebSocket-Kanäle:
   - `/ws/cli`: CLI <-> Backend Actions.
   - `/ws/frontend`: Frontend <-> Backend Deltas/Commands.
4. Auth:
   - CLI nutzt Shared Secret (z. B. `~/.codey/backend-token`) oder OIDC (reuse `BackendCredentials`).
   - Frontend authentifiziert via Session Cookie + optional Access Token (später erweiterbar).

### 3.2 CLI- & Session-Management
1. **CLI Registry**
   - Map `cliId -> { socket, status, sessions[], lastSeen, capabilities }`. CLI-ID wird lokal generiert (UUID) und persistent in `~/.codey/cli-id`.
   - Heartbeat/keepalive. Bei Disconnect markiert `status = disconnected`, Sessions werden auf `waitingForCli`.
2. **Session Lifecycle**
   - Session-Objekte speichern `workdir` (vom CLI gemeldet), `approvalPolicy`, `model`, `provider`, `autoApprovalMode`, `lastResponseId`.
   - Backend weiß, welche CLI-Worker `session.cliId` bedient, und queued Actions nur dort.
   - Bei Reconnect: CLI liefert `knownSessions`, Backend vergleicht, sendet `ResumeAction` (Working dir, pending steps).
3. **Action Queue**
   - Für jede Session existiert FIFO-Queue. `AgentLoop` generiert Tool-Invocations; `RunCommand`-Actions werden in Queue gestellt, CLI acked via `ActionResult`.
   - Backend wiederholt Actions bei Timeout (idempotente IDs).

### 3.3 AgentLoop im Backend
1. Move `AgentLoop` (`src/utils/agent/agent-loop.ts`) unverändert in Backend, aber:
   - `handleExecCommand`-Aufrufe werden ersetzt durch `await cliBridge.runCommand(...)`.
   - `runApplyPatchTool`, `runListDirTool`, `MCP` -> alle delegieren an CLI.
2. `cliBridge` Implementation:
   - Schickt `BackendToCliAction` über WebSocket.
   - Wartet auf `ActionResult`, mapped stdout/stderr in `ExecStreamChunk`.
   - Respektiert Cancelation (AbortController pro action).
3. Approval Flow:
   - `getCommandConfirmation` implementiert via Frontend: 
     - AgentLoop sendet `ApprovalRequestDelta`.
     - Frontend-User genehmigt; Backend ruft `AgentLoop.confirmCommand`.
4. Sessions -> `AgentLoop` Instanzen:
   - Start pro Session (maybe Worker thread). Maintains `onItem`, `onLoading`, `onCommandApproval`. Items fließen in Session-State.
   - Session-State persistiert nach jedem Item (Rollout + current JSON).

### 3.4 State & Delta Engine
1. **State Model**
   - `BackendState = { clis: Map, sessions: Map, approvals: Map }`.
   - `SessionState` enthält `items: AgentResponseItem[]`, `plan`, `tools`, `pendingAction`.
2. **Delta Computation**
   - Jede Mutation triggert `stateVersion++`.
   - Deltas generieren via JSON-Patch (fast json patch) oder custom "event" Format.
   - Frontend-Clients abonnieren `/ws/frontend` und erhalten Deltas mit `sequenceNr`.
   - Replay-Mechanismus bei Reconnect (Client sendet `lastSeq`).

### 3.5 Persistenz
1. **Workdir Handling**
   - CLI meldet (pro Session) `workdirPath`. Backend speichert nur relative Pfade + hash.
2. **Session Storage**
   - Ähnlich `saveRollout` (`src/utils/storage`) -> Backend schreibt JSON/NDJSON pro Session (Log + summary).
   - Frontend kann `GET /api/sessions/:id/log` für Historie abrufen.
3. **Rate Limits**
   - Backend nutzt bestehenden `BackendClient` + `status.ts`, updated `session.rateLimitSnapshot`.

## 4. CLI-Worker
### 4.1 Basics
1. Neues CLI (`npm run build:cli` erzeugt `dist/cli-worker.js`) startet mit `node dist/cli-worker.js`.
2. CLI liest persistente Config in `~/.codey/cli-worker.json` (enthält `cliId`, `backendUrl`, `authToken`, `connectedSessions`). **Dieser Datensatz wird einmalig erzeugt**, wenn der Benutzer nach dem Installieren das CLI startet und der Terminal-Output nur einen Satz enthält: „Bitte öffne den HTML5-Client unter <URL> und verbinde dieses CLI.“ Der Benutzer klickt _im Browser_ auf „CLI verknüpfen“, worauf das Backend den CLI-Link-Code / QR-Code liefert, den das CLI loggt. Ab dann wird _alles_ im Browser erledigt.
3. Startablauf:
   - CLI sammelt Hostinfos (OS, Node-Version, sandbox-mode, `additionalWritableRoots`).
   - Wartet passiv darauf, dass über die HTML5-Webseite der Pairing-Code bestätigt wird (Backend ruft CLI über temporäre REST/WebSocket-Verbindung). Keine Eingabe im Terminal.
   - Nach erfolgreicher Verknüpfung schreibt das CLI `backendUrl`, `cliId`, `sessionToken`, Auth-Status in die Config, stellt eine dauerhafte Verbindung zu `/ws/cli` her und **verharrt dann nur noch im „Waiting for work…“ Zustand**.
4. UI:
   - Minimaler Terminal-Output: Start/Stop, Pairing-Hinweis, laufende Actions („[session-xyz] Running: npm test“), Fehler. **Keine Buttons, keine Anleitung außer dem initialen Pairing-Link.**

### 4.2 Action-Ausführung
1. CLI empfängt `BackendToCliAction`.
2. Für `run_command`:
   - Reuse `handleExecCommand` (`src/utils/agent/handle-exec-command.ts`) inkl. Sandbox, auto-approve-checks aber _ohne_ UI. `getCommandConfirmation` wird im Backend gelöst, CLI akzeptiert `approvalContext` im Action.
   - Stream stdout/stderr via `ExecLifecycleEvent` -> `ActionProgress` Events.
3. Für `apply_patch`, `write_file`, `read_file`, `list_dir`:
   - Reuse existierende Tools `fs-tools.ts`, `runApplyPatchTool`.
4. `mcp_call`:
   - CLI hält `McpConnectionManager` (aus `src/utils/mcp`). Actions lösen `list_resources`, `call_tool` etc. lokal aus, Ergebnis zurück.
5. Heartbeat: CLI sendet alle 5 Sekunden `heartbeat` + `runningActions`.

### 4.3 Session Binding
1. Backend sendet `attach_session` Action (SessionId, workdir). CLI prüft ob `workdir` existiert, legt falls nötig an. Keine Rückfragen; CLI loggt nur „Session session-abc attached at /path“.
2. CLI kann mehrere Sessions parallel bedienen; `handleExecCommand` bereits threadsafe via per-action Mutex.
3. Bei CLI-Shutdown: sendet `disconnect` Event mit Grund (`manual`, `error`). Backend markiert Sessions.

## 5. HTML5-Frontend
### 5.1 Tech-Stack
1. React + Vite + TypeScript.
2. State-Management über Zustand oder Redux Toolkit Query.
3. WebSocket-Client für Deltas, plus REST-Fallback für Initial-Snapshot.

### 5.2 UI-Features
1. **CLI Panel**
   - Liste aller CLIs (Status: connected/disconnected). Buttons: Connect (falls offline), Details (OS, Version, Sessions).
2. **Session List**
   - Mehrere Sessions als Tabs oder Cards. Jede Card zeigt: CLI Icon, Modell, Approval Mode, Fortschritt, Disconnected-Anzeige falls CLI weg.
3. **Session View**
   - Chat/Items (re-use Rendering-Logik aus `TerminalMessageHistory` -> React-Komponenten, Formatierung `formatCommandForDisplay`).
   - Action/Plan Panel: `formatPlanUpdate` (aus `src/utils/agent/plan-utils.ts`).
   - Buttons: Approve/Reject Commands, Trigger neue Prompts, Start neue Session (Dialog w/ CLI Auswahl).
4. **Notifications**
   - Realtime Banner bei CLI-Reconnect, Errors.
5. **Auth Flow**
   - Wenn `GET /api/auth/status` meldet „unauthenticated“, zeigt das Frontend prominent ein Auth-Panel mit Button „Bei Codex anmelden“. Klick ruft `POST /api/auth/login-link` auf, Backend liefert URL + state-id. UI öffnet Link (neues Tab), User durchläuft Codex-Login. Nach Callback (`/api/auth/callback`) aktualisiert Backend den Status, Frontend empfängt Delta `authStatusUpdated` und blendet Banner aus. Dieser Flow ersetzt die bisherige CLI-basierte Auth komplett.

### 5.3 Frontend-Backend API
1. On load: `GET /api/state/bootstrap` -> {clis, sessions, approvals}.
2. WebSocket `/ws/frontend`: send `{"type":"subscribe","lastSeq":n}`.
3. Commands:
   - `{"type":"create_session","cliId":...,"prompt":...,"workdir":...}`
   - `{"type":"send_prompt","sessionId":...,"text":...,"images":[]}`
   - `{"type":"approve_command","sessionId":...,"actionId":...,"decision":"approve"|"reject","message":...}`

### 5.4 Styling & UX
1. Responsive Layout (Sidebar + Main Panel).
2. Syntax Highlighting via `Prism` oder `shiki` für diffs/commands.
3. Persist UI preferences (dark/light) im LocalStorage.

## 6. End-to-End Tests mit Playwright
1. **Test-Launcher**
   - Custom Playwright fixture startet Backend (spawn `npm run backend:dev -- --port=0`), wartet auf HTTP ready.
   - Start CLI-Worker als Kindprozess mit dediziertem Temp-Workdir (`TMP/codex-e2e/cliX`), injiziert Env (dummy API keys, sandbox=mock). CLI verbindet sich mit Backend.
   - Start Web-Frontend via `npm run web:dev -- --port=0` oder `vite preview`.
   - Fixture reicht Frontend-URL an Tests, plus Handles zum Backend (REST) um Seeds zu setzen.
2. **Szenarien**
   - `multiSession.spec.ts`: Start CLI, erstelle 2 Sessions via UI, verifiziere, dass Commands laufen (Backlog -> Completed). UI zeigt Delta-Streaming.
   - `disconnectReconnect.spec.ts`: Kill CLI-Prozess, Playwright erwartet "disconnected" Label, starte CLI neu, UI zeigt sofort "reconnected", Session streamt weiter.
   - `approvalFlow.spec.ts`: Backend fordert Approval -> UI Modal -> click Approve -> Command executed -> output visible.
   - `multipleCLIs.spec.ts`: starte 2 CLI-Prozesse mit unterschiedlichen IDs, UI wählt CLI B, Session binds to B.
   - `playwrightRecordings`: optional Video/Screenshots.
3. **Assertions**
   - Nutze Playwright `expect.poll` auf DOM, vergleiche JSON logs (Download via `GET /api/sessions/:id/log`), verifiziere, dass `AgentResponseItem` Sequenzen identisch mit Backend-State.
4. **Teardown**
   - Tests stoppen CLI/Backend/Frontend, löschen Temp-Workdirs.

## 7. Übergangs-/Migrationsschritte
1. Legacy-CLI bleibt (aiflare) bis neuer Stack fertig. Wir halten `packages/cli-worker` im selben Repo, aber Release-Gates (Beta-Flag).
2. Schrittweises Extrahieren:
   - Phase 1: Shared-Package extrahieren (aber CLI-Alt + Backend-Prototyp parallel).
   - Phase 2: Backend + CLI-Worker MVP (ohne UI), Playground via CLI logs.
   - Phase 3: Frontend + Playwright Tests.
3. Jede Phase endet mit Playwright-Integrationstest `npm run e2e`.

## 8. Nicht-funktionale Anforderungen
1. **Fehlerhandling**: Backend hält Session- und CLI-Logs (rotating file). Actions idempotent.
2. **Security**: CLI führt nur lokale Actions aus, sandbox default = host (wie aktuell), optional seatbelt.
3. **Scalability**: Backend EventLoop (Node) + Worker Threads pro Session. Option: Später Rust-Backend.
4. **Observability**: Structured Logging (pino/winston). Metrics (CLI connected, actions per minute).

## 9. Deliverables
1. `packages/shared`, `packages/backend`, `packages/cli-worker`, `packages/web`.
2. Docs:
   - `docs/architecture.md` (erläutert 3-Komponenten-Modell + Sequenzdiagramme).
   - `docs/testing.md` (Playwright-Setup, CLI/Backend fixtures).
   - CLI README (neue Flags).
3. CI-Pipeline: lint/test/build + `npm run e2e` (headless Playwright, xvfb).

Diese Planung deckt alle geforderten Aspekte (Session-/CLI-IDs, AgentLoop im Backend, UI-Deltas, echte End-to-End-Tests) auf der Basis der bestehenden `aiflare`-Codebasis ab und definiert detailliert, wie die Migration/Neuentwicklung umzusetzen ist.
