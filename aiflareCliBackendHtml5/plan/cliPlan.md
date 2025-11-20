# CLI-Worker Architektur
```
┌──────────────┐   pair link   ┌──────────────┐   ws actions   ┌──────────────┐
│  CLI Runner  │──────────────▶│ ConfigStore  │───────────────▶│ BackendLink  │
└──────┬───────┘               └──────┬───────┘                └──────┬───────┘
       │                              │                               │
       │                              │                               ▼
       │                        saved tokens                    ┌─────────────┐
       ▼                                                        │ActionRouter │
┌──────────────┐   exec/apply   ┌──────────────┐                └──────┬──────┘
│ ActionQueue  │───────────────▶│ CommandExec  │                       │
└──────────────┘                └──────────────┘                       ▼
                                                             ┌─────────────────┐
                                                             │ ToolAdapters    │
                                                             │ (FS/MCP/etc.)   │
                                                             └─────────────────┘
```

Der CLI-Worker ist ein einst process-basierter Node-CLI-Prozess, der nach dem initialen Pairing nur noch passiv auf Backend-Aktionen wartet, sie lokal ausführt und den Fortschritt protokolliert. Keine User-Eingaben, kein Prompting.

---

## Module & Klassen

### 1. `src/cli-runner.ts`
- **Verantwortung:** Prozess-Einstieg; liest Config, zeigt Pairing-Hinweis, startet Backend-Verbindung. Implementiert als saubere TypeScript-Klasse (`CliRunner`) statt lose Funktionen.
- **Kernmethoden:**
  - `async main()`: Bootstrapping, Signal-Handler, loggt Status.
  - `private async ensurePaired(): Promise<void>`: Prüft Config auf gültigen `cliId`, falls fehlt → ruft `PairingManager.initiate()`.
  - `private startWorkers(link: BackendLink)`: Spawnt `ActionQueue`-Loop, Heartbeat-Timer.
- **Interaktionen:** Nutzt `ConfigStore` für persistente Daten, `BackendLink` für WS-Verbindung, `ActionRouter` für Action-Handling.

### 2. `src/config-store.ts`
- **Verantwortung:** Lesen/Schreiben von `~/.codey/cli-worker.json`. **Wichtig:** Dieser Store hat nichts mit den bestehenden `aiflare`-Configs zu tun; er enthält ausschließlich die persistenten Verbindungsdaten des neuen CLI-Workers (z. B. `cliId`, `sessionToken`, `backendUrl`). Dadurch muss der Nutzer nach dem initialen Pairing nie wieder etwas eingeben. Wird als eigene Klasse `ConfigStore` mit Instanzmethoden (oder zur Not statischen Methoden) umgesetzt – kein „lose Funktionen exportieren“.
- **Kernmethoden:**
  - `load(): CliConfig` / `save(CliConfig)`.
  - `update(partial: Partial<CliConfig>)`.
  - `getPairingCode(): string | null`.
- **Implementation:** `fs/promises`, `zod` für Validierung, Dateisperre via `flock`.

### 3. `src/pairing-manager.ts`
- **Verantwortung:** Einmaliger Verknüpfungsflow über HTML5-Frontend. Klasse `PairingManager` kapselt den kompletten Ablauf.
- **Kernmethoden:**
  - `async initiate(): Promise<PairingResult>`: Ruft Backend-`/api/cli/pairing-request`, erhält `pairCode`, öffnet Browser-Link (optional), loggt Info. Wartet per SSE/long-poll auf Bestätigung.
  - `async waitForConfirmation(requestId)`: Blockiert bis Backend Credentials liefert.
- **Ergebnis:** `cliId`, `sessionToken`, `backendUrl`, `linkedAt`.

### 4. `src/backend-link.ts`
- **Verantwortung:** WebSocket-Client zum Backend (Klasse `BackendLink`). Alle Interaktionen laufen über Instanzmethoden dieser Klasse.
- **Kernmethoden:**
  - `connect(): Promise<void>`: initiiert `/ws/cli`.
  - `onAction(handler: (action: BackendToCliAction) => void)`.
  - `send(event: CliToBackendEvent)`.
  - `scheduleHeartbeat(intervalMs)`.
  - `reconnectLoop()`: automatischer Retry.
- **Besonderheiten:** Verwaltet `sessionToken`-Rotation, TLS, Logging.

### 5. `src/action-queue.ts`
- **Verantwortung:** Puffert eingehende Aktionen, priorisiert Attach/Detach vor RunCommand. Klasse `ActionQueue`.
- **Kernmethoden:**
  - `enqueue(action)`.
  - `startDispatch(processor: ActionRouter)`.
  - `acknowledge(actionId, result)`.
- **Implementation:** Async-Generator per `async *` + `AbortController`.

### 6. `src/action-router.ts`
- **Verantwortung:** Mapping `BackendToCliAction` → spezialisierte Handler. Klasse `ActionRouter`.
- **Kernmethoden:**
  - `register(type, handler)`.
  - `async handle(action)`.
- **Handlers:** `run_command`, `apply_patch`, `read_file`, `list_dir`, `mcp_call`, `attach_session`, `detach_session`.

### 7. `src/command-executor.ts`
- **Verantwortung:** Reuse von `handleExecCommand`, aber als library-freier Executor. Klasse `CommandExecutor`.
- **Kernmethoden:**
  - `async run(action: RunCommandAction): Promise<ActionResult>`.
  - `private streamChunks(hooks)`: schreibt stdout/stderr an BackendLink.
- **Features:** Sandboxoptionen, Sitzungs-Scoped `alwaysApprove` (aus Backend gesteuert).

### 8. `src/tool-adapters/`
- `apply-patch-adapter.ts`: Wrappt `runApplyPatchTool` in einer Klasse (`ApplyPatchAdapter`).
- `fs-adapter.ts`: `readFile`, `listDir`, `grep`.
- `mcp-adapter.ts`: pflegt `McpConnectionManager`.
- Jeder Adapter implementiert Interface `ToolAdapter { supports(actionType): boolean; execute(action): Promise<ActionResult>; }`.

### 9. `src/logger.ts`
- **Verantwortung:** Simple stdout-Logger mit Level `info|warn|error`. Klasse `CliLogger`.
- **Methoden:** `logActionStart`, `logActionEnd`, `logStatus`.

### 10. `src/state/session-tracker.ts`
- **Verantwortung:** Buchführung, welche Sessions mit welchen Workdirs verbunden sind. Klasse `SessionTracker`.
- **Methoden:** `attach(sessionId, meta)`, `detach(sessionId)`, `getWorkdir(sessionId)`.
- **Verwendung:** `ActionRouter` prüft Workdir pro Action.

---

## Wichtige Abläufe

1. **Startup & Pairing**
   - `cli-runner.main()` → `ensurePaired()` ruft `PairingManager`.
   - Backend erzeugt Link, UI zeigt QR/Code → Benutzer klickt → Backend sendet Token zurück.
   - `ConfigStore.save()` persistiert `cliId`, `sessionToken`.

2. **Steady State**
   - `BackendLink` hält WS offen, `ActionQueue` wartet.
   - Bei Aktion: `ActionRouter` delegiert; `CommandExecutor` führt aus; Streams werden als `CliToBackendEvent` gesendet.

3. **Reconnect/Failure**
   - WS drop → `BackendLink.reconnectLoop()`.
   - Laufende Actions erhalten Abort → Backend wird informiert → Session markiert `waiting`.

4. **Shutdown**
   - `SIGINT` → send `disconnect` event → sauberer Exit.
