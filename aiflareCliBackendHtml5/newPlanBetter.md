## Ziel
- React-Hooks wie `useCallback`/`useMemo`/`useState` in den TSX-Komponenten ablösen; stattdessen `useLocalState` + `reRender` verwenden.
- Sicht-/Unread-/Running-Status bleibt in simplen JSON-Objekten (`sessionUpdateTracker`), UI reagiert nur über `reRender`.
- Kein `queueMicrotask`/Nebenpfade mehr; klare Datenflüsse aus appState + SessionState.

## Ist-Stand (betroffene Files)
- `frontend/src/components/SessionWorkspace.tsx`: bereits teilweise auf `useLocalState` umgebaut, aber noch viele Effekte und temporäre Varianten; Titel/Visibility-Logik muss geprüft werden.
- `frontend/src/components/SessionWindow.tsx`: nutzt `useCallback`/`useMemo`/`useLayoutEffect`/`useState`; Status/Renders nicht über `useLocalState`.
- `frontend/src/components/SessionCreatorPanel.tsx`, `TopBarOpenableElement.tsx`: weiter `useMemo`/`useState`.
- `frontend/src/state/sessionUpdateTracker.ts`: Flags (running/unread/visible) als Map + Listener; ok, aber UI muss strikt darauf hören.
- `frontend/src/controllers/sessionEventsController.ts`: setzt running/unread über Tracker; muss zu neuer Sichtbarkeitssteuerung passen.
- Tests/e2e: `dockview-tab-behavior`, `timeline-scroll-stability`, Utils greifen auf `window.getSessionState` zu; müssen nach Umbau stabil bleiben.

## Umbau-Plan
1) **SessionWindow vereinfachen**
   - Lokalen State (`input`, `sending`, `canceling`, Auto-Scroll-Flags) in `useLocalState` halten, `reRender` statt `useCallback/useMemo/useLayoutEffect`.
   - Timeline-Sortierung/Kontext-Berechnung als einfache Funktionen; nur `useEffect` für DOM-Eingriffe (TextArea-Höhe, Scroll).
   - Running-Status ausschließlich über `sessionUpdateTracker.setSessionRunning` + Tracker-Flags lesen.

2) **SessionWorkspace aufräumen**
   - Effektketten minimieren: aktive Session aus Dockview-API lesen, dann `applyVisibility` einmal pro Ready + bei Panel/Group-Events; Intervall prüfen/entfernen wenn überflüssig.
   - Panel-Titel-Build ohne `useMemo/useCallback`; `useLocalState` als einziges Render-Trigger (badge/stateVersion, panel maps).
   - Sicherstellen, dass `setSessionVisible`/`setSessionUnread` nur an einer Stelle laufen (Tab-Klick/Active-Change), kein `queueMicrotask`.

3) **Übrige Komponenten**
   - `SessionCreatorPanel`, `TopBarOpenableElement` auf `useLocalState` umstellen; keine `useMemo`.
   - Prüfen, ob weitere TSX-Dateien versteckte Hooks nutzen; vereinheitlichen.

4) **State/Controller Feinschliff**
   - `sessionEventsController`: bei Summary/Events nur Tracker-API benutzen; keine doppelten unread-Berechnungen.
   - `sessionUpdateTracker`: Listener behalten, aber klare Helper-Doku (wann running/unread/visible gesetzt wird); ggf. `recordSessionTimelineUpdate` nur über Controller aufrufen.

5) **Tests absichern**
   - E2E `dockview-tab-behavior`: bestätigt Spinner/Unread ohne Focus-Steal; nach Umbau erneut prüfen/aktualisieren.
   - `timeline-scroll-stability`: sicherstellen, dass Scroll-Logik im neuen `SessionWindow` unverändert bleibt.

6) **Manuelle Checks**
   - Mehrere Sessions öffnen, Tabs wechseln, minimieren/wiederherstellen: Unread-Dot und Spinner bleiben korrekt.
   - Eingabe/Cancel-Flows beobachten; `reRender`-Zyklen nachvollziehen (keine Endlosschleife).
