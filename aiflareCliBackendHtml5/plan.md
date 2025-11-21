## Ziel

Wir ersetzen das bisherige Doppel‐System aus `SessionMessage[]` und separaten Agent‑Events durch eine einzige, strikt zeitlich sortierte Timeline je Session. Jede Nachricht, jedes Tool-Ereignis, jeder Plan-Schritt – alles wird als Event behandelt. Die CLI lässt dann genau dieselbe Reihenfolge wie das CLI-Terminal sehen.

---

## Umsetzungsschritte (mit Tests je Schritt)

### Schritt 1 – Protokoll & Shared Types
- **Änderungen**
  1. `protocol/src/index.ts`: `SessionEvent`-Union definieren (inkl. `type: "message"`), `BootstrapState.timeline` einführen, alte Felder entfernen.
  2. `sdk/types` falls relevant synchronisieren.
  3. Dokumentation (README / docs) aktualisieren: Timeline ist die einzige Quelle.
- **Tests**
  - TypeScript Build (`pnpm run build` im Protocol).
  - Evtl. lint/check, falls vorhanden.

### Schritt 2 – SessionStore & Persistenz
- **Änderungen**
  1. `backend/src/services/sessionStore.ts`: Snapshot `version: 2`, `events[]`. Entferne `messages`, `agentItems`, `toTranscriptRecord`, etc.
  2. APIs `appendMessage`, `appendAgentEvents`, `upsertAssistantMessage` so anpassen, dass sie Timeline-Einträge schreiben/ersetzen.
  3. Utility `getTimeline(sessionId)` implementieren.
  4. Snapshots mit `version !== 2` ignorieren (kein Legacy).
- **Tests**
  - Unit-Tests (falls vorhanden) erweitern: `appendMessage`, Event-Ersetzung, Sortierung.
  - Manuell `backend` builden (`npm --workspace backend run build`).

### Schritt 3 – Backend API & SSE
- **Änderungen**
  1. `/api/bootstrap`: JSON enthält `timeline`. Alte Felder raus.
  2. `/api/sessions/:id/messages` ersetzen durch `/timeline`.
  3. `/api/session-events`: nur noch `session_events_appended`.
  4. Debug-Routen auf Räumung anpassen.
  5. `SessionRunner`, `handleAgentStreamItem` nur noch Timeline-Events erzeugen.
- **Tests**
  - Integrationstest (falls vorhanden) oder manuell: `curl /api/bootstrap`, prüfen, ob Timeline geliefert wird.
  - Backend e2e-Smoke: `npm --workspace backend run build` + (optional) `npm --workspace frontend run e2e --grep backend`.

### Schritt 4 – Frontend State & API Client
- **Änderungen**
  1. `frontend/src/api/protoClient.ts`: timeline-fetch + SSE Payload aktualisieren.
  2. `frontend/src/state/appState.ts`: `sessionTimeline` Map, neue Helper (`setTimeline`, `appendTimeline`).
  3. `sessionUpdateTracker`: nur noch Events auswerten.
- **Tests**
  - Unit-Tests (falls existieren) anpassen.
  - `npm --workspace frontend run build`.

### Schritt 5 – UI: SessionWindow, Navigator, Workspace
- **Änderungen**
  1. `SessionWindow`: nimmt Timeline, rendert Event-Karten.
  2. UI-Komponenten für Plan/Tool/Reasoning/Exec.
  3. Stildefinitionen (`styles.css`) + Icons/Badges.
  4. `SessionNavigator` preview via Timeline.
- **Tests**
  - Visueller Check (`npm --workspace frontend run dev`).
  - Snapshot/DOM Assertions in Playwright (nach Update).

### Schritt 6 – Playwright-Tests updaten
- **Änderungen**
  1. Bestehende Specs (`chat-basic`, `tool-shell`, `tool-view-image`, `dockview`, `session-read-workspace-file`, `multi-session`, `chat-streaming`, `chat-national-anthem`) auf Timeline-Selektoren umstellen.
  2. Neue Specs hinzufügen:
     - `timeline-plan-updates`
     - `timeline-tool-lifecycle`
     - `timeline-exec-stream`
     - `timeline-reasoning`
     - `timeline-retry-notice`
     - `timeline-replacement-order`
     - `timeline-sort-by-timestamp`
- **Tests**
  - `npm run clean:e2e && npm --workspace frontend run e2e`.
  - Fokus-grep für einzelne neue Szenarien während der Implementierung.

### Schritt 7 – Manuelle Validierung / Cleanup
- **Änderungen**
  - CLI-Flow durchklicken, Timeline beobachten.
  - README/Dokumentation finalisieren.
- **Tests**
  - Finales `npm --workspace frontend run build`.
  - (Optional) `npm run e2e` Gesamt-Suite.

---

Mit diesem Plan haben wir eine klare Roadmap, um Backend, Protokoll und Frontend auf eine einheitliche Timeline-Struktur zu heben und die gewünschte Parität zum CLI zu erreichen.
