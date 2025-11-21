# Detailplan „Echte AgentLoop Sessions“

Die folgenden Schritte sind so sortiert, dass jede Ausbaustufe testbar bleibt. Alle Entscheidungen berücksichtigen, dass Modellaufrufe lokal im Backend laufen, während Tool-Ausführungen weiterhin über den existierenden CLI-Worker (Action-Queue/WebSocket) abgewickelt werden.

---

## 1. Backend-Domäne & Persistenzbasis
1. [x] **SessionStore + SessionState implementieren**
   - Datenstruktur kapselt Transcript (User/Assistant-Items, Tool-Ausgaben), Status (`waiting|running|streaming|error`), aktives Modell, Pending-User-Messages und In-Flight-AgentItems.
   - Speicherung als In-Memory-Map mit optionalem File-Checkpoint (JSON pro Session in `backend/data/sessions/<id>.json`), damit Neustarts Transkripte behalten.
   - Design-Entscheidung: SessionState besitzt Methoden `appendMessage`, `appendAgentItem`, `updateStatus`. BackendApp ruft nur diese API, damit AgentLoop-Runner und REST-Routen konsistent bleiben.
   - **Tests:** Vitest-Klassentests (z. B. `npx vitest run SessionState.test.ts` im `backend`-Ordner). Setup erzeugt echte `SessionState`-Instanz, ruft Methoden direkt auf (kein REST). Persistenzteil schreibt temporäre Datei, die anschließend via `JSON.parse` verifiziert wird.
2. [x] **ActiveSessionRegistry**
   - Verwaltet `activeSessionId` pro CLI/User-Kontext (anfangs global, später multi-user-fähig). Liefert Observable-Interface für Frontend-Deltas.
   - Design-Entscheidung: Registry hält nur IDs, damit mehrere Runner dieselben SessionState-Instanzen teilen können; keine Nachrichtendaten duplizieren.
   - **Tests:** Ebenfalls Vitest-Klassentest. Registry wird instanziiert, Listener-Funktionen (mocks) per `vi.fn()` registriert, anschließend `setActiveSession`/`clear` aufgerufen. Ein Test nutzt `Promise.all` um gleichzeitige Registrierungen zu simulieren und bestätigt, dass Event-Reihenfolge stabil bleibt.

## 2. AgentLoop Runner pro Session
1. [x] **SessionRunner-Service**
   - Pro Session ein Worker-Objekt, das den portierten `AgentLoop` instanziiert (keine vereinfachten Varianten oder Mocks) und echte Modellstreams verarbeitet.
   - Runner besitzt Input-Queue; `POST /messages` legt UserPrompt dort ab. Runner stößt `agent.run()` an, sobald der Loop idle ist.
   - Responses aus `AgentLoop` kommen via Hooks (`onItem`, `onStatusChange`, `onToolCallPending`, …) direkt in SessionState → löst Delta an Clients aus.
   - Design-Entscheidung: Runner wird bei Session-Erstellung gestartet und lebt so lange, bis Session geschlossen wird; kein „fire-and-forget“.
2. [x] **Modell- & Tool-Konfig**
   - Nutzt dieselben Config-Lader wie `aiflare/src/cli.tsx` (AppConfig, PromptTemplates). Runner erhält Workdir, Model, Credentials exakt wie der CLI-Client – inklusive echter `auth.json` + ENV.
   - Backend lädt Auth-Daten lokal; CLI-Worker wird nur noch benötigt, wenn Tools laufen müssen.
   - Jede Session trägt ihr eigenes `workdir`; Runner führt AgentLoop mit diesem Pfad aus, damit Dateibezüge stimmen.
3. [x] **Tool-Bridge in AgentLoop**
   - AgentLoop bietet Hooks für `function_call`s. Wir führen ein `ToolExecutor`-Interface ein (z. B. `execute(invocation): Promise<ToolOutput>`), das zunächst eine einfache In-Memory-Implementierung für Tests bereitstellt (z. B. sammelt Aufrufe und antwortet deterministisch), später aber durch eine echte CLI-basierten Implementierung ersetzt wird.
   - Schrittfolge:
     1. **Testexecutor:** Minimaler Executor (nur in Testumgebung genutzt) liefert synchrone Antworten, damit AgentLoop/SessionRunner-Infrastruktur getestet werden kann.
     2. **CLI-Executor (offen):** Reale Implementierung legt Actions in die Queue, wartet auf CLI-Ergebnisse und streamt diese zurück; ersetzt Testexecutor in Produktivpfaden.
   - Sobald CLI ack’t bzw. Resultate streamt, schreibt Backend die Tool-Ausgabe als AgentItem zurück in SessionState.
   - Design-Entscheidung: Tool-Bridge implementiert ein Interface `ToolExecutor`, das wahlweise „local“ oder „cli“ nutzen könnte. Aktuell einzig „cli“, aber strukturieren, damit später lokale Tools möglich werden.
   - Tool-Calls enthalten stets `workdir` und `sessionId`, sodass ein einzelner CLI-Worker parallel mehrere Workdirs bedienen kann (kommandoseitig keine globale `chdir`).
   - **Tests:** Vitest-Service-Test mit echtem AgentLoop (über Testexecutor) prüft Queue → AgentLoop-Aufrufe sowie SessionState-Mutationen. Nach Umstellung auf CLI-Executor werden dieselben Tests gegen den realen Worker gefahren (nur skippen, wenn CLI nicht verfügbar). Integrationstest (REST) nutzt reale Credentials (`auth.json`/ENV).

## 3. Backend-APIs & Streaming
1. [x] **REST**
   - `POST /api/sessions/:id/messages` legt Nachricht in SessionState, triggert Runner → Response wird asynchron geliefert. Endpoint gibt 202 + current transcript-Version zurück, kein synchrones Reply-String mehr.
   - `GET /api/sessions/:id/transcript` liefert kompletten Transcript + Status + laufende Tool-Infos.
   - `GET /api/sessions/:id/deltas?since=<cursor>` (oder WebSocket) streamt nur Änderungen; nutzt ActiveSessionRegistry zur Filterung.
   - **Tests:** Supertest-Integration (`npx vitest run backendApp.rest.test.ts`). Der Test startet BackendApp auf Random-Port, nutzt HTTP-Requests (`request(serverUrl).post(...)`) und prüft Statuscodes + JSON-Bodies. Enthält Szenarien: ok, unknown session, leere Nachricht.
2. **WebSocket/Server-Sent Events**
   - Ein neuer Channel `session_events` sendet Events (`session_messages_appended`, `session_status_changed`, `session_tool_update`). Frontend subscribed via ProtoClient.
   - Design-Entscheidung: SSE reicht aus (push-only, keine bidirektionale Steuerung). Wenn WS bereits existiert, Kanal wiederverwenden.
   - **Tests:** Node/E2E-Light Test (Vitest). Verwendet npm-Paket `eventsource` um SSE-Verbindung aufzubauen. Test sendet REST-POST auf `/messages`, wartet via Promise auf `session_messages_appended`. Falls kein Event innerhalb 5s, schlägt Test fehl. Kein Browser nötig.
3. **Action-Queue Erweiterungen**
   - ToolCall-Payload enthält `sessionId`, `toolName`, `arguments`, `replyChannel`.
   - CLI sendet Ergebnisse mit `tool_result` Actions → Backend matched via `actionId`.
   - **Tests:** REST-basierter Backend-Test: via Supertest wird Session erstellt, Backend löst ToolCall simuliert aus (mock AgentLoop). Anschließend `GET /api/clis/:cliId/actions` → Queue enthält `agent_tool_call`. Test ruft `/api/clis/:cliId/actions/:id/ack` und prüft, dass `GET /actions` leer ist.

## 4. CLI-Worker & Tool-Ausführung
1. **Protokollerweiterung**
   - `cli-worker` erhält neue Action-Typen `agent_tool_call` & `agent_tool_result`. Worker führt Tools via existierenden Exec-Pipelines aus (run_command → spawn shell im Workdir, apply_patch → applyPatch util, MCP call → forward).
   - Design-Entscheidung: CLI bleibt Single-Threaded, also Tools laufen seriell. Backend muss Warteschlange pro Session führen, damit mehrere Toolcalls geordnet bleiben.
   - **Tests:** Vitest in `cli-worker`. `fetch`/WebSocket-Aufrufe werden mit `vi.stubGlobal`. Test injiziert Action JSON direkt in Worker-Loop und ersetzt `child_process.spawn`/`fs` durch Mocks, um Ausführung zu beobachten.
2. **REST-Basierte Tests für Actions**
   - Neue Backend-Testdateien (Vitest) starten Backend im Memory-Modus, mocken CLI-Webhook mit HTTP-Callbacks:
     - Test 1: Trigger ToolCall → Backend legt Action in Queue → Test emuliert CLI-Ack via `/api/clis/:cliId/actions/:actionId/ack` und sendet Ergebnis via `/api/clis/:cliId/actions`. Prüfung: SessionState enthält Tool-Output.
     - Test 2: Fehlerpfad (CLI liefert Error) → Backend markiert Session als `error`, Transcript enthält Fehlermeldung.
   - Keine Playwright-Abhängigkeit erforderlich; Tests interagieren nur über REST + In-Memory SessionStore.
   - **Tests:** Backend-Integrationstest (kein Playwright). Script startet Backend + Fake-CLI HTTP-Server. Nach `POST /messages` liest Test `/api/clis/:cliId/actions`, sendet per REST `tool_result` (POST). Abschließend `GET /transcript` prüft, dass Tool-Ausgabe erscheint.

## 5. Frontend Anpassungen
1. **State-Management**
   - `appState` hält `Map<SessionId, SessionTranscript>` und Cursor pro Session. Neue Actions: `appendSessionMessages(sessionId, delta)`, `updateSessionStatus`.
   - ProtoClient erstellt SSE-Subscription und verteilt Events an appState (kein 5s-Polling mehr).
   - **Tests:** Jest-Unit-Test (React/TypeScript). `appState` wird instanziiert, künstliche Deltas (Plain Objects) angewendet, Assertions prüfen innere Maps & Cursor-Fortschritt. Läuft via `npm test -- appState.test.ts` im `frontend`-Ordner oder `npx vitest` falls gleiche Testumgebung genutzt wird.
2. **SessionWindow**
   - Anzeige basiert auf delta-updates, Input disabled, solange Session kein Runner hat oder Tool ausführt.
   - Message-Komponenten unterscheiden User, Assistant, Tool (z. B. Badges, spinner bei streaming).
   - **Tests:** React Testing Library (Jest DOM). Komponente bekommt Fake-ProtoClient + Mock-AppState. Test sendet simulierte SSE-Events (per helper) und erwartet, dass DOM sofort aktualisiert wird. Axe-Check optional.
3. [x] **SessionNavigator**
   - Separate Komponente mit Status-Badges (`running`, `waiting`, `tool`). Zeigt letzte Message-Vorschau (aus SessionState).
   - Klick ruft `appState.setActiveSession`, kein zusätzlicher REST-Call nötig, weil Transcript bereits im Store liegt; falls nicht, ProtoClient lädt verpasste Deltas seit Cursor.
   - **Tests:** RTL-Interaktionstest. Rendert `SessionNavigator` mit Dummy-Sessions, triggert Klick via `fireEvent.click`, verifiziert Badge-Text (z. B. „RUNNING“) und dass Callback genau einmal feuert.
4. **Error/Retry UX**
   - Wenn SessionState `error` meldet, SessionWindow zeigt Banner + Retry-Button (`/messages` resubmits last pending prompt).
   - **Tests:** RTL-Spec setzt `appState.sessions.get(id).status = "error"` vor Render. Erwartet Banner mit Fehltext. Simuliert Klick auf Retry-Button und verifiziert, dass Mock-Funktion `client.sendSessionMessage` aufgerufen wird.

## 6. Teststrategie (geordnet nach Abhängigkeiten)
1. **Unit/Vitest**
   - `SessionState.test.ts`: Append/Trim, Persist/Reload, Concurrent Tool Items.
   - `SessionRunner.test.ts`: Mock AgentLoop (per dependency injection) → prüft, dass Hooks Deltas auslösen.
   - **Automatisierung:** `npm run test:backend` (Vitest) – Script im Root oder Backend-Package, das `vitest` mit Konfiguration startet. Läuft im CI nach jedem Commit.
2. **Integration (Backend-only)**
   - Spin Backend + Fake AgentLoop (deterministisch „Hallo“) → REST `POST /messages` → `GET /transcript` zeigt gestreamte Antwort, ohne CLI.
   - Tool-Bridging-Test wie oben beschrieben.
   - **Automatisierung:** Dedizierter npm-Script `npm run test:backend:int`, der `vitest --run --config vitest.integration.config.ts` ausführt.
3. **Frontend Component/Jest**
   - `SessionWindow.test.tsx`: Delta-Event simuliert, UI rendert neue Bubble ohne manuellen Fetch.
   - `SessionNavigator.test.tsx`: Status badges + click-behavior.
   - **Automatisierung:** `npm run test:frontend` (Jest). Coverage aktiviert, damit UI-Deltas abgedeckt sind.
4. **Playwright E2E**
   - Re-use existierende Specs, aber Assertions warten auf Streaming (z. B. spinner). Global Setup startet Backend+Frontend, CLI optional (nur nötig, wenn Tools/Terraform?). Für Basistest „Hallo“ → CLI nicht benötigt, da Modell im Backend läuft.
   - Neuer E2E „Tool call passt durch CLI“ (optional): UI triggert Aktion, CLI-Worker läuft wirklich mit run_command. Nur nötig, wenn CLI in Setup verfügbar ist.
   - **Automatisierung:** `npm run test:e2e` (Playwright). CI-Stage startet Backend/Frontend/optional CLI via globalSetup, führt `chat-basic`, `multi-session`, `tool-bridge` Specs sequenziell aus.

## 7. Observability & Ops
1. **Structured Logging**
   - SessionRunner schreibt Events `agent:start`, `agent:token`, `tool:queued`, `tool:result`. Logs enthalten `sessionId` → hilft Debugging.
2. **Metrics Hooks**
   - Lightweight counters (z. B. Prometheus endpoint) für aktive Sessions, laufende Tools, Fehlerraten. Nicht zwingend für MVP, aber Hooks vorsehen.
   - **Tests:** Node-Script `metrics.smoke.test.ts` ruft `/metrics` Endpoint (falls Prometheus) und erwartet Counter `session_active_total`. Für Logging: Vitest ersetzt `logToFile` durch In-Memory Array und überprüft, dass `agent:start` Einträge erscheinen.

Diese Reihenfolge ermöglicht erst stabile Backend-Domäne, dann Runner + APIs, anschließend CLI-Brücke und zuletzt UI/Test-Schichten. Jeder Block endet mit eigenem Testpaket, sodass Regressionen früh auffallen.

---

## Aktueller Stand im Repo (Stand: lokale Änderungen `main`)

### Backend & Persistenz
- `SessionStore` + `SessionState` sind implementiert inklusive Persistenz, Pending Messages & AgentItems (`backend/src/services/sessionStore.ts`). Vitest deckt das Schreiben/Lesen via `backend/tests/sessionStore.test.ts` ab.
- `ActiveSessionRegistry` existiert (`backend/src/services/activeSessionRegistry.ts`) und besitzt eigene Tests, Listener-API etc.
- REST-Endpunkte für Sessions, Messages, History sowie CLI-Tool-Resultate sind in `backend/src/backendApp.ts` fertig. Bootstrapping liefert Sessions+Transcripts, so dass das Frontend direkt initialisiert werden kann.

### AgentLoop & Tool Bridge
- `SessionRunnerService` und die AgentLoop-Runtime-Fabrik sind vorhanden (`backend/src/services/sessionRunner.ts`, `backend/src/utils/agent/runtime.ts`). Ohne `OPENAI_API_KEY` läuft automatisch der Legacy-Responder, ansonsten AgentLoop.
- Tool-Bridge inkl. `ToolResultBroker`, `CliToolExecutor` und Action-Queue ist geschrieben (siehe `backend/src/services/toolExecutorFactory.ts`, `backend/src/services/toolResultBroker.ts`). Tests prüfen das Enqueueing + Awaiting der Ergebnisse.
- CLI-Worker verarbeitet `agent_tool_call` Actions und gibt Resultate per `/api/clis/:cliId/tool-results` zurück (`cli-worker/src/cliWorkerApp.ts`, `cli-worker/src/net/backendClient.ts`). Shell-Tool schon abgedeckt, Fehlerpfade schicken strukturierte JSONs zurück.

### Frontend
- `appState` verwaltet Maps für CLIs, Sessions, Actions und Transcript (`frontend/src/state/appState.ts`). Bootstrap- und Polling-Refresh laufen in `App.tsx`.
- `SessionWindow` rendert den Verlauf samt Input und Send-Button (`frontend/src/components/SessionWindow.tsx`). Nachrichten holen sich aktuell per REST (`ProtoClient.sendSessionMessage`/`fetchSessionMessages`).
- Session-Liste + Formular liegen in `SessionFormSection.tsx`. Ein dedizierter `SessionNavigator` ist noch TODO (geplant in Abschnitt 5.3), ebenso SSE/Deltas (Abschnitt 3.2/5.1).

### Tests & Playwright-Vorbereitung
- Backend besitzt Unit-/Integrationstests für Store, Runner, Tool-Bridge, Backend-Routen (`backend/tests/*.test.ts`).
- CLI-Worker-Tests laufen via `npm --workspace cli-worker run test:unit`.
- Playwright Setup existiert: `frontend/tests/e2e/global-setup.ts` startet Backend (`backend/dist/index.js`), CLI-Worker (`cli-worker/dist/index.js`) und Frontend-Preview. Specs `chat-basic.spec.ts` & `multi-session-context.spec.ts` schicken echte Nachrichten durch SessionWindow.
- Test-Utilities (waitForBackendCli, waitForSessionCount, etc.) kapseln REST Polling; CLI-Registrierung läuft automatisch über den Worker.

### Offene Punkte vor „Playwright grün“
- UI empfängt Updates weiterhin per Polling (kein SSE/WebSocket). Für langlebige Runs sollte Abschnitt 3.2 umgesetzt werden, die vorhandene Logik funktioniert aber für Playwright so lange das Polling mitzieht.
- `SessionNavigator` + Status-Badges fehlen (Abschnitt 5.3). Aktuell übernimmt `SessionFormSection` die Auswahl.
- Tool-E2E (Abschnitt 4.2 + Playwright „tool-bridge“) ist noch nicht geschrieben. Backend/CLI-Pfade sind vorbereitet, aber es fehlt ein Test, der echten Tool-Output im UI verifiziert.
- Sobald `npm run build` (Root) gelaufen ist, lässt sich `npm run e2e` ausführen. Falls Credential-abhängige AgentLoop-Runs geplant sind, vorher `OPENAI_API_KEY` + Auth-Flow sicherstellen; ohne Key arbeitet der Legacy-Responder und die „Hallo“-Checks bestehen trotzdem.
