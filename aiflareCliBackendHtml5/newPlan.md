## Plan: Session state tracking (unread/running/visibility) unified

1) State store + API
   - Implement a module-scoped map keyed by SessionId storing `{ running: boolean; unread: boolean; visible: boolean }`.
   - Expose CRUD helpers: `setRunning(sessionId, bool)`, `setUnread(sessionId, bool)`, `setVisible(sessionId, bool)`, and a `getState(sessionId)` read helper (returns defaults when missing).
   - Provide `listenOnStateChanges(listener)` returning an unsubscribe; listener receives `(sessionId, state)` whenever any field changes. Deduplicate events: only fire when a field actually changes.

2) Consolidate existing trackers
   - Remove/replace `runningSessions` Set and unread counters/refs (`lastSeenUpdatesRef`, `getSessionTimelineUpdateCount`, etc.) in favor of the unified state.
   - Keep timeline counts for other consumers if needed, but ensure unread is a flag set in the new store, not derived ad hoc.
   - Update `sessionUpdateTracker` (or successor) to only hold the unified state + listener registry.

3) Lifecycle updates
   - On prompt send start: `setRunning(id, true)`.
   - On completion/error/cancel or summary status change: `setRunning(id, false)`.
   - On new timeline events: if `visible` is false, `setUnread(id, true)`; if true, leave unread as is.
   - On session open/activation (user views): `setUnread(id, false)` and `setVisible(id, true)`.
   - On panel blur/hidden/minimize: `setVisible(id, false)`.

4) Visibility wiring
   - Hook Dockview events (`onDidActivePanelChange`, panel activation, close/minimize flows) to update `visible` appropriately per session.
   - Ensure minimized/closed panels mark `visible` false; re-open/restore sets `visible` true and clears unread.
   - Avoid stealing focus: only change `visible` when Dockview reports active panel change, not when background events arrive.

5) UI consumers
   - Session tab titles: subscribe via `listenOnStateChanges`; show spinner on `running`, dot on `unread`. Unsubscribe on unmount/effect cleanup.
   - Session window status bar can read `running` for the run indicator; timeline auto-scroll logic remains separate but can ignore unread.
   - Remove per-render badgeVersion hacks; rely on listener-driven state updates to trigger React state changes (e.g., keep a `stateVersion` that increments in the listener to force re-render where needed).

6) Testing
   - Update/extend e2e tests to assert spinner/unread behavior still works with the unified store (dockview-tab-behavior).
   - Verify scroll-stability remains unaffected (timeline-scroll-stability already passes).
