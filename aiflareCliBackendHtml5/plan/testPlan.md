# Testplan (TDD-Reihenfolge)

_Prämisse:_ Alle Tests laufen gegen echte Systeme. Wir starten stets reale Prozesse (Backend-Server, CLI-Worker, Frontend-App) und nutzen echte Codex/Credentials. Es gibt keinerlei Mocks oder Fallbacks. Jeder Schritt baut auf dem vorherigen auf, sodass Test-Driven Development möglich ist.

---

## Phase 1 – Foundations (Unit-Tests)

1. **CLI-Worker Unit-Tests**
   - Ziel: Klassen wie `ConfigStore`, `PairingManager`, `BackendLink`, `ActionRouter`, `CommandExecutor`.
   - Vorgehen:
     - Schreibe Jest/Vitest-Unit-Tests, die echte Dateisystem-Zugriffe (in Temp-Verzeichnissen) nutzen.
     - `BackendLink`-Tests verwenden ein echtes WebSocket-Echo-Serverchen (lokal gestartet).
     - Keine Mocks – nur reale Ressourcen (Temp-Dateien, Ports).
   - Reihenfolge:
     1. `ConfigStore` Tests (Speichern/Laden, Recovery).
     2. `PairingManager` Tests (erzeugt Link, wartet auf Confirm via realem Mini-HTTP-Endpunkt).
     3. `BackendLink` Tests (Verbindungsaufbau, Reconnect).
     4. `ActionRouter` Routing-Tests mit echten Handler-Klassen.
     5. `CommandExecutor` Tests (führt real Kommandos aus; z. B. `echo`, `cat`).

2. **Backend Unit-Tests**
   - Ziel: `CliRegistry`, `UserStore`, `SessionManager`, `AgentSessionState`, `ActionBroker`, `AuthStore`.
   - Vorgehen:
     - Jest/Vitest mit realen Dateisystemen (z. B. `mkdtemp`).
     - Für `ActionBroker` startet ein echter Dummy-CLI-Endpunkt, der WebSocket-Verbindungen annimmt.
   - Reihenfolge:
     1. `AuthStore` – Speichern/Laden/Rotation.
     2. `CliRegistry` – Registrierung, Disconnect, Reconnect.
     3. `UserStore`/`SessionManager` – Session-Lifecycle.
     4. `AgentSessionState` – Item/Approval/Loading-State.
     5. `ActionBroker` – Timeout/Retry mit realem Dummy-CLI.

3. **Frontend State-Tests**
   - Ziel: `AppState` Klasse, ProtoClient-Wrapper, useLocalState-Factory.
   - Vorgehen: Node-basierte Tests (Playwright Test Runner mit `test.describe`), die `AppState` instantiieren, Deltas einspeisen und DOM-losen Assertions durchführen.

---

## Phase 2 – Integrationstests (zwei Komponenten)

4. **CLI + Backend (ohne Frontend)**
   - Start Backend via `npm run backend:dev -- --port=0`.
   - Start CLI-Worker mit echtem Pairing gegen das Backend.
   - Testfälle:
     - Pairing und Persistenz: CLI startet neu, bleibt verbunden.
     - RunCommand: Backend sendet Shell-Action, CLI führt real `echo` aus.
     - ApplyPatch/FileOps: Backend ruft Tools, CLI führt am Temp-Repo aus.
   - Umsetzung: Playwright Test Runner (Node tests), die Prozesse spawn und via HTTP/WS interagieren.

5. **Frontend + Backend (ohne CLI)**
   - Backend wird gestartet; zusätzlich ein Mock-CLI? Nein – stattdessen Backend nutzt eine Test-CLI, die wir mitstarten, damit Sessions existieren.
   - Frontend per `npm run web:dev -- --port=0`.
   - Playwright Browser-Tests:
     - Auth-Banner: Login-Link, Statuswechsel.
     - Session-Liste: Anzeigen, CLI-Zuordnung (Fake CLI via Backend API).
     - Approvals UI: Backend generiert Pending Approval (über Test-API), UI zeigt Modal.

---

## Phase 3 – Vollständige End-to-End (drei Komponenten)

6. **CLI + Backend + Frontend**
   - Start Backend, CLI-Worker, Frontend real.
   - Playwright steuert Browser, interagiert mit UI, beobachtet Sessions live.
   - Szenarien (in Testreihenfolge):
     1. **Multi-Session Flow**: zwei Sessions anlegen, Commands laufen lassen.
     2. **Disconnect/Reconnect**: CLI killen, UI zeigt Status, CLI wieder starten.
     3. **Approval Flow**: Command Approval im UI bestätigen/ablehnen.
     4. **Multiple CLIs**: zwei Worker-Instanzen, UI wählt gezielt aus.

---

## Phase 4 – Aiflare-Äquivalenztests

7. **Übertragen der existierenden `aiflare`-Tests**
   - Jede relevante Integration aus `aiflare/tests` wird als Playwright-E2E adaptiert:
     - `tests/agentLoop`, `tests/fs-tools`, etc. – jetzt als End-to-End mit realen Komponenten.
   - Reihenfolge:
     - Zuerst die „kleinen“ Feature-Tests (z. B. simple Prompt).
     - Dann komplexere (Multi-command, MCP, apply_patch).
   - Ausführung: `npm run e2e:aiflare` (Playwright Suite).

---

## Ausführung & Infrastruktur

- Test Runner: Playwright Test (auch für reine Node-Tests, dank `test.describe`/`test.step`).
- Keine Mocks: Credentials in `.env.test` (gesicherter Speicher). Backend nutzt echte OpenAI/Codex-Konten.
- Jeder Test startet reale Prozesse; Cleanup killt alle Subprozesse und löscht Temp-Verzeichnisse.
- CI-Sequenz:
  1. `npm run test:unit` (CLI + Backend + AppState Tests).
  2. `npm run test:integration:cli-backend`.
  3. `npm run test:integration:frontend-backend`.
  4. `npm run e2e` (alle drei Komponenten).
  5. `npm run e2e:aiflare`.
