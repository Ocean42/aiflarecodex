## AgentMan UI Refactor Plan

### Goals
1. Add a global top bar with branding plus interactive drop-downs (TopBarOpenableElementComp) replacing existing sidebar sections.
2. Move Client Logs and future top-bar panels into the new component, including live badge counts and modal/dialog presentation.
3. Replace current session navigator with dock-only behavior: sessions open directly as docked windows; closed sessions move into a "Minimized Sessions" top bar element.
4. Introduce Dockview "+" buttons to create sessions in-place, collecting required metadata inside each dock panel.
5. Ensure session titles automatically use/update the working directory name and track rename operations.

### Components & Changes
#### 1. Top Navigation Bar
- Add `TopBarOpenableElement` component handling badge counts & open/close state.
- Top-left: static AgentMan logo/title.
- Top-right stack: `Minimized Sessions (N)` + `Logs (M)` + future items (componentized).
- Clicking an element opens a floating dialog overlay (standardized dialog component).

#### 2. Dialog Infrastructure
- Create reusable `ModalDialog` (portal + backdrop) so Client Logs, Minimized Sessions, etc., share behavior (close button, scrollable content).
- Client Logs dialog: current log list with scroll + “Close”.
- Minimized Sessions dialog: list of closed sessions with “Restore” buttons, hooking back into Dockview.

#### 3. Dockview Integration
- At Dockview group tab bar: add "+" action to spawn a new empty panel.
- Panel workflow:
  - Default state: form fields (CLI selector, workdir, model) + Create button.
  - After creation, replace form with `SessionWindow`.
  - Track panel metadata (sessionId, status).
- Sessions open only in Dockview; no left sidebar list.
- Closing panel -> move sessionId into minimized collection; re-open via dialog re-adds the panel without rerendering layout globally.

#### 4. Session Lifecycle & Titles
- Session titles = directory name from workdir; update whenever summary changes.
- When backend summary updates include `workdir` changes, rename the panel title accordingly.
- Maintain full session list in state (for SSE sync) but only render docked/minimized views.

#### 5. State & Interactions
- Track minimized sessions in AppState (new structure) so dialogs reflect SSE updates.
- Ensure Dockview panel removal doesn’t automatically spawn another panel; user actions drive layout.
- Modify `SessionWorkspace` to manage Dockview entirely (no fallback panel text except when zero sessions).

### Implementation Steps
1. **Top Bar & Dialog infra**
   - Add `TopBar.tsx`, `TopBarOpenableElement.tsx`, `ModalDialog.tsx`.
   - Integrate in `App.tsx` layout above workspace.
   - **Playwright:** Verify top bar renders AgentMan logo and each openable element toggles a modal.
2. **Client Logs & Minimized Sessions**
   - Move log list rendering into dialog content.
   - Add minimized sessions state + UI.
   - **Playwright:** Trigger log entries, ensure Logs badge updates, dialog shows entries, close button works.
3. **Dockview "+" flow**
   - Update `SessionWorkspace` to append new panel on `+`.
   - Panel state machine: form -> active session.
   - **Playwright:** Click “+”, create session in-panel, assert form disappears and session window + title appear.
4. **Session title updates**
   - Derive title from summary.workdir basename; update Dockview panel title on summary changes/SSE.
   - **Playwright:** Simulate SSE title change, confirm Dockview tab text updates without closing panel.
5. **Remove old sidebar session list**
   - Drop existing `SessionNavigator`.
   - Ensure session creation flows exclusively through Dockview panels.
   - **Playwright:** Confirm no sidebar list remains; minimized sessions dialog is the only place to restore panels (close + restore scenario).
6. **Testing**
   - Update Playwright e2e scenarios for new UI (session creation in panel, logs dialog visibility, minimized sessions restore).

### Playwright Test Coverage
1. **Top bar rendering**
   - Verifies AgentMan logo text appears on load.
   - Confirms each `TopBarOpenableElement` shows badge counts and opens/closes its dialog on click (Logs + Minimized Sessions).

2. **Client Logs dialog behavior**
   - Trigger log events (e.g., session creation) and ensure the Logs badge increments.
   - Clicking Logs opens a scrollable dialog; close button hides it.

3. **Dockview session creation**
   - Clicking Dockview “+” spawns a panel with CLI/workdir/model form.
   - After filling and clicking Create, the form disappears, `SessionWindow` loads, and panel title equals workdir basename.

4. **Session rename updates**
   - Simulate backend summary updates that change `workdir`; assert Dockview tab title updates accordingly.

5. **Minimized sessions workflow**
   - Closing a panel moves it to “Minimized Sessions (N)” badge.
   - Opening the minimized dialog and clicking restore re‑adds the panel; badge count decreases.

6. **Cancel spinner/regression**
   - Start the debug long-running task, ensure spinner + Cancel button appear below timeline.
   - Clicking Cancel emits system message + tool failure entry; spinner hides afterwards.

7. **Context indicator**
   - (Existing test) verifies percentage decreases as timeline grows and UI updates.

8. **Logs badge integration**
   - After noticeable actions (create/cancel), confirm Logs badge increments and dialog contains latest entries.
