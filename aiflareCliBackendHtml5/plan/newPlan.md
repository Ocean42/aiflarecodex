# Ziel
Eine vollständige End-to-End-Flusskette aufbauen, in der jede Session im Backend ihren eigenen AgentLoop besitzt, das Frontend pro Session ein Chat-Fenster („SessionWindow“) darstellt und Playwright einen realen Benutzer simuliert, der mit dem Agenten chattet. Der Test soll sicherstellen, dass eine vom Benutzer geschickte Nachricht wie „hi ai antworte mir bitte mit hallo“ als echte Modellantwort („Hallo“) im UI erscheint – ohne CLI-Interaktion, alles läuft über Backend ↔ AgentLoop ↔ Frontend.

---

## Phase 1 – Backend: echte Sessions & AgentLoop
1. **Session-Domäne ausbauen**
   - Implementiere `SessionStore`/`SessionState`, die pro Session Verlauf, aktives Modell, Pending-User-Messages und Agent-Items halten.
   - Ergänze einen `ActiveSessionRegistry`, der mehrere Sessions verwalten kann und einen Flag „activeSessionId“ für Benutzerkontext bereitstellt.
2. **AgentLoop-Einbindung pro Session**
   - Beim Erstellen einer Session startet das Backend einen dedizierten AgentLoop-Runner.
   - Runner verarbeitet Benutzerprompts direkt, nutzt die vollständigen Modell- und Tool-Pipelines (keine Mocks). Konfiguration und Credentials werden wie im echten Codex-Flow aus der `auth.json` bzw. Umgebung geladen.
   - Implementierung, Konfig und Tool-Handling orientieren sich 1:1 am bestehenden AgentLoop im `aiflare/`-Ordner (gleiche Klassen, Hooks, Error-Handling). Jede Session besitzt ein reales AgentLoop-Objekt mit echtem Streaming.
   - Wenn der AgentLoop Tools wie `run_command`, `apply_patch` oder `mcp_call` anfordert, werden diese Anfragen über eine `ToolExecutor`-Schicht verarbeitet. Schrittfolge: (1) einfacher Test-Executor (in-memory, nur für Tests) um die Runner-Infrastruktur zu validieren; (2) produktiver Executor, der Actions in die Queue legt und echte CLI-Ausführung anstößt.
   - Responses werden als Items in den SessionState geschrieben und via Delta an Frontend gestreamt.
3. **REST/WebSocket-Erweiterungen**
   - Neue Endpunkte: `POST /api/sessions/:id/messages` (Userprompt), `GET /api/sessions/:id/transcript`.
   - Deltas müssen Session-Content aktualisieren (z. B. `session_messages_appended`, `session_active_changed`).
4. **Tests**
   - Unit-Tests für SessionState (Speichern/Lesen, Multi-Session).
   - Integrationstest: Backend-only → POST message → Response wird persistiert und abrufbar.

---

## Phase 2 – Frontend: SessionWindow & State
1. **AppState erweitern**
   - Speichere komplette Session-Verläufe (`Map<SessionId, SessionTranscript>`).
   - Tracke `activeSessionId` global; provide actions `setActiveSession`, `appendSessionMessages`.
2. **SessionWindow-Komponente**
   - Nutzt `useLocalState`, abonniert `appState`.
   - Rendert den Verlauf der aktiven Session (User + Assistant Messages) ähnlich wie Codex-Terminal.
   - Enthält Input-Leiste und Send-Button; Enter löst `protoClient.postSessionMessage` aus.
3. **SessionNavigator**
   - Liste aller Sessions (Sidebar oder Tabs). Klick setzt `activeSessionId` und triggert `SessionWindow`.
   - Zeigt Status-Badges (running, idle) und last message preview.
4. **ProtoClient/UI-APIs**
   - Methoden `sendSessionMessage`, `selectSession` implementieren.
   - UI reagiert auf Deltas, re-rendered SessionWindow ohne Reload.
5. **Smoke-Tests**
   - Jest-Komponententest: SessionWindow rendert Chat, input disabled wenn keine Session aktiv.

---

## Phase 3 – Playwright E2E „Chat antwortet Hallo“
1. **Test-Fixture-Erweiterung**
   - Global Setup startet Backend + AgentLoop ohne CLI (nur Modell-Backend, CLI optional).
   - Session wird via REST-Helper vorab erstellt oder im Test über UI erzeugt.
2. **Testablauf**
   - Playwright öffnet Frontend, stellt sicher, dass SessionList sichtbar ist.
   - Wählt oder erstellt eine Session → SessionWindow zeigt Verlauf.
   - Tippt `hi ai antworte mir bitte mit hallo` in Input, sendet.
   - Erwartet, dass Backend-Agent Antwort liefert, UI zeigt neue Assistant-Bubble mit „Hallo“ (oder regex auf „Hallo“).
3. **Verifikation**
   - Assertions auf DOM (z. B. `[data-testid="session-window"]` enthält Text „Hallo“).
   - Zusätzlich optional API-Poll (`GET /api/sessions/:id/transcript`) um Konsistenz zu prüfen.

### Zusätzlicher E2E-Test „Multi-Session Kontexttreue“
1. **Setup**
   - Im Test zwei Sessions erstellen (z. B. Session1, Session2). Beide erhalten initiale Begrüßung: „Hallo, antworte mir bitte wenn ich frage welche Session mit SessionX und jetzt erstmal mit Okay.“
   - Für jede Session erwartet Playwright zunächst die Antwort „Okay“ im jeweiligen Chat.
2. **Konversationsphase**
   - Wechsel zu Session1 → sende „Welche Session?“ → UI muss Antwort „Session1“ anzeigen.
   - Wechsel zu Session2 → sende die gleiche Frage → Antwort „Session2“.
3. **Ziele**
   - Beweist, dass Sessions isolierte Kontexte besitzen und der AgentLoop pro Session den Verlauf getrennt hält.
   - Sicherstellt, dass Frontend beim Wechsel die korrekten Transkripte rendert (State im appState + SessionWindow).

---

## Phase 4 – Multi-Session UX & Persistenz
1. **Speicher-Optimierung**
   - Session-Verläufe beim Backend persistieren (Datei/DB) und beim Frontend lazy laden.
   - UI behält pro Session den bisherigen Verlauf im Memory, um Instant-Switch zu ermöglichen.
2. **Weitere Tests**
   - Playwright-Szenario: zwei Sessions erstellen, zwischen ihnen wechseln, sicherstellen, dass Chats unabhängig sind.
   - Edge-Test: activeSession wechseln während Response streamt → beide Streams korrekt im jeweiligen Fenster.

---

## Deliverables & Definition of Done
- Backend verarbeitet `POST /messages` pro Session mit echtem AgentLoop, Responses erscheinen ohne CLI.
- Frontend bietet SessionWindow mit Chat-Input; Wechsel zwischen Sessions aktualisiert das Fenster sofort.
- Playwright-Test `session-chat.spec.ts` beweist End-to-End: Benutzertext → Modellantwort „Hallo“ im UI.
- Dokumentation der neuen UX & APIs (README/plan update).
