# Backend Architektur
```
         REST / WebSocket / Auth
┌────────────────────────────────────────────────┐
│ HTTPServer (Express)                           │
│  ├─ AuthController ──┐                         │
│  ├─ SessionController│                         │
│  ├─ CliController    │                         │
│  └─ FrontendDeltas   │◀───┐                    │
└──────────┬─────────────┘    │ SSE/WS           │
           │                   │                 │
           ▼                   │                 │
┌────────────────────────────────────────────────┐
│ Core Services                                  │
│  ├─ CliRegistry                                │
│  ├─ UserStore                                  │
│  │   └─ SessionManager (pro User)              │
│  │       └─ AgentSession (pro Session)         │
│  │             ├─ SingleSessionRunner (Loop)   │
│  │             ├─ SessionState (local store)   │
│  │             └─ ActionBridge (CLI <-> Loop)  │
│  ├─ FrontendNotifier (Broadcast Deltas)        │
└──────────┬─────────────────────────────────────┘
           │
           ▼
┌────────────────────────────────┐
│ Persistence & Integrationen    │
│  ├─ AuthStore (auth.json)      │
│  ├─ SessionLogStore            │
│  ├─ RateLimitClient            │
│  └─ ModelProvider/OpenAI       │
└────────────────────────────────┘
```

---

## Module & Klassen

### 1. HTTP / Transport
1. **`src/server/http-server.ts`**
   - Klasse `HttpServer`: Erstellt Express-App, hängt Controller an, startet HTTP + WebSocket (ws).
   - Methoden: `start()`, `stop()`, `applyMiddleware()`, `mountControllers()`.
2. **Controller-Klassen**
   - `AuthController`, `CliController`, `SessionController`, `FrontendDeltasController`.
   - Jede Klasse kapselt ihre Endpunkte; Methoden wie `createLoginLink()`, `handleCallback()`, `listSessions()`.
   - Keine losen Handlerfunktionen – alles über Instanzmethoden.

### 2. WebSocket Bridges
1. **`src/server/ws-cli-gateway.ts`**
   - Klasse `CliWsGateway`: Verwaltet `/ws/cli`.
   - Methoden: `handleConnection(socket, cliId)`, `sendAction(cliId, action)`, `onEvent(event)`.
2. **`src/server/ws-frontend-gateway.ts`**
   - Klasse `FrontendWsGateway`: `/ws/frontend`.
   - Methoden: `pushDelta(delta)`, `registerClient(client)`, `handleCommand(client, command)`.

### 3. Kern-Services
1. **`CliRegistry`**
   - Datenstruktur: Map `cliId -> CliRecord`.
   - Methoden: `register(descriptor)`, `markConnected(cliId, socketRef)`, `markDisconnected(cliId)`, `getAvailableCli()`, `getSessions(cliId)`.
   - Ereignisse: `onCliStatusChanged`.
2. **`UserStore` & `SessionManager`**
   - `UserStore` kapselt User-bezogene Daten (Auth-Status, Sessions). Key: `userId`.
   - Jede Benutzerinstanz besitzt ihren eigenen `SessionManager`.
   - `SessionManager` verwaltet den Lebenszyklus der Sessions des jeweiligen Users (Erstellen, Zuweisen an CLI, Speichern).
   - Methoden:
     - `createSession({ cliId, workdir, model, approvalMode, prompt })`.
     - `enqueuePrompt(sessionId, promptItems)`.
     - `updateApproval(sessionId, approvalId, decision)`.
     - `listSessions(userId)`.
   - Nutzt `AgentSupervisor`.
3. **`SingleSessionRunner` / `AgentSupervisor`**
   - `SingleSessionRunner` kapselt eine AgentLoop-Instanz pro Session (kann optional WorkerThread sein).
   - `AgentSupervisor` koordiniert alle Runner eines Users (Start, Stop, Restart).
   - Methoden:
     - `start(sessionId, params)`.
     - `stop(sessionId)`.
     - `pushUserInput(sessionId, items)`.
   - Callbacks: `onItem`, `onLoading`, `onCommandApproval`, `onRequestAction`.
4. **`ActionBroker`**
   - Brücke zwischen AgentLoop-Toolrequests und CLI-WebSocket.
   - Methoden:
     - `requestRunCommand(sessionId, payload): Promise<ActionResult>`.
     - `requestTool(sessionId, toolAction)`.
   - Handhabt Timeouts, Retries, Cancel.
5. **`AgentSessionState` (pro AgentSession)**
   - Lokaler Store innerhalb der AgentSession. Enthält Items, letzten Response-Status, Pending Actions, RateLimits.
   - Methoden:
     - `appendItem(item)`, `setLoading(flag)`, `setCliStatus(status)`, `recordApproval(approval)`.
   - Jeder State-Change löst ein `SessionSnapshot`-Event an `DeltaBus` aus.
6. **`FrontendNotifier`**
   - Kein globaler Cache/Bus: Jeder neue Frontend-Client ruft einfach `GET /api/sessions` (und ggf. `/api/clis`) ab und bekommt den aktuellen Snapshot.
   - Laufende Änderungen kommen direkt von den AgentSessions: Sobald `AgentSessionState` ein Item anhängt oder sich der CLI-Status ändert, erzeugt es ein Delta, das unmittelbar an alle verbundenen Frontends gesendet wird (`FrontendNotifier.broadcast(delta)`).
   - Wiederverbindungen: Client fragt den kompletten Snapshot neu ab; es gibt keine Delta-Replay-Logik.

### 4. Persistenz & Integrationen
1. **`AuthStore`**
   - Speichert Codex/OIDC-Credentials (`auth.json` analog).
   - Methoden: `load()`, `save(tokens)`, `isValid()`.
2. **`SessionLogStore`**
   - Struktur: `~/.codey/sessions/<sessionId>/rollout.ndjson`.
   - Methoden: `append(sessionId, event)`, `load(sessionId)`, `compact(sessionId)`.
3. **`RateLimitClient`**
   - Reuse `BackendClient` + `status.ts`.
4. **`ModelProvider`**
   - Nutzt `createResponsesRequest`, `startResponsesStream`.

### 5. Auth Flow
1. `AuthController.createLoginLink` erzeugt `state`, `codeVerifier`, leitet zu Codex.
2. Nach Callback: `verifyCode`, speichert Token in `AuthStore`.
3. `UserStore` aktualisiert den Auth-Status und informiert `FrontendNotifier` → Frontend blendet Banner aus → CLI erhält `authStatus` per `BackendToCliAction` falls nötig.

---

## AgentLoop Integration
- `AgentSupervisor` konfiguriert `AgentLoop` mit:
  - `onItem`: delegiert an `AgentSessionState.appendItem`, welches sofort ein Delta über `FrontendNotifier` liefert.
  - `onLoading`: `AgentSessionState.setLoading`.
  - `getCommandConfirmation`: sendet `approvalRequested` Delta via `DeltaBus`, blockiert auf Anwenderentscheid.
  - Tool-Handlers (`shell`, `apply_patch`, `mcp`) rufen `ActionBroker`.
- Sessions im Status `waitingForCli` pausieren, bis `CliRegistry` den CLI wieder verbindet.

---

## API / Protokoll
- **CLI**: WebSocket JSON (Aktion → Ergebnis), Heartbeat alle 5s, Ack IDs.
- **Frontend**:
  - REST `GET /api/state/bootstrap`.
  - SSE/WS Deltas (`deltaSeq`, `payload`).
  - Commands: `create_session`, `send_prompt`, `approve_command`, `select_cli`, `force_disconnect`.

---

## Klassen- und Dateienübersicht
| Datei | Inhalt |
| --- | --- |
| `src/index.ts` | Startpunkt, lädt Config, `HttpServer.start()` |
| `src/config.ts` | Backend-spezifische Settings (Ports, model defaults) |
| `src/services/cli-registry.ts` | `CliRegistry` |
| `src/services/session-manager.ts` | Session Lifecycle |
| `src/services/agent-supervisor.ts` | AgentLoop Worker Mgmt |
| `src/services/action-broker.ts` | CLI Action Requests |
| `src/state/frontend-notifier.ts` | Broadcasts an UI |
| `src/persistence/auth-store.ts` | Auth-Daten |
| `src/persistence/session-log-store.ts` | Rollout Logging |
| `src/controllers/*.ts` | REST/SSE Controller |
| `src/ws/*.ts` | WebSocket Gateways |

---

## Wichtige Abläufe
1. **Session Creation**
   - Frontend POST `/api/sessions` → `SessionManager.create` → `AgentSupervisor.start`.
   - AgentSession erzeugt initialen `SessionState`, `FrontendNotifier` broadcastet neue Session-Liste (optional, oder UI pollt erneut).
   - `CliRegistry` weist Session dem CLI zu (falls offline → pending).
2. **Run Command**
   - AgentLoop ruft `ActionBroker.requestRunCommand`.
   - Broker sendet `BackendToCliAction` via WS.
   - CLI streamt `ActionProgress` → Broker re-streamt an AgentLoop.
3. **Approval**
   - AgentLoop `getCommandConfirmation` → `AgentSessionState` erstellt Approval-Record → `FrontendNotifier` signalisiert UI.
   - Frontend POST `/api/sessions/:id/approval`.
4. **Disconnect/Reconnect**
   - `CliRegistry.markDisconnected` → Sessions `waiting`.
   - Bei Reconnect: `AgentSupervisor` resend pending Actions.
