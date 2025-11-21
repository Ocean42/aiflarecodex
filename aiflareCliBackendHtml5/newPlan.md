## New Plan – Frontend State & Timeline Reliability

1. **Audit data flow between backend SSE and appState**
   - Confirm every place where session timeline/summary data enters the app (bootstrap, SSE, manual refresh).
   - Identify where assistant update counters are incremented (`sessionUpdateTracker`) and which event types should contribute.
   - Outcome: catalog of all entry points + list of event types to keep vs ignore.

2. **Refactor SSE handling into a single stateful controller**
   - Move the EventSource subscription out of the React component tree into a dedicated module/class that owns connection lifecycle and dispatches normalized events into `appState`.
   - Provide an imperative `start()`/`stop()` API that `App` calls once; the controller maintains its own references and never triggers React state directly.
   - Emit explicit debug logs (`[sse-controller] connected`, `[sse-controller] event=…`, `[sse-controller] disconnected`) so we can trace data flow without relying on component-level `console.log`.
   - Outcome: SSE logic becomes framework-agnostic; React view simply renders what `appState` exposes.

3. **Harden Timeline updates & counters**
   - Update `appState.appendSessionTimeline` to:
     - Deduplicate using `(id, createdAt)` and ignore events that contain neither assistant message nor meaningful content changes.
     - Only call `recordSessionTimelineUpdate` when a new assistant `message` event is appended (skip summaries/reasoning/tool meta).
   - Ensure console logging is removed from pure view components (e.g. `SessionNavigator`) now that diagnostics can be emitted by the new SSE controller.
   - Outcome: `window.getSessionTimelineUpdateCount` aligns with backend chunk counts; UI no longer logs duplicates.

4. **Verify CLI action payloads always carry `workdir`**
   - Double-check `enqueueAction` + tool executor changes cover all action types (tool calls, run_command, login).
   - Extend end-to-end tests (or add a lightweight integration test) that asserts actions delivered to the CLI include the requested workdir by querying `/api/actions` immediately after creation.
   - Add backend logs (`this.log("Action queued", { cliId, workdir, … })`) to confirm which directory is being attached at enqueue time.
   - Outcome: Workspace-specific specs (`session-read-workspace-file`, `tool-view-image`) run against the intended directory.

5. **Regression pass**
   - Rebuild backend/frontend, run the adjusted Playwright specs, focusing on:
     - `chat-streaming` (chunk parity),
     - `session-read-workspace-file`,
     - `tool-view-image`.
   - Once green, re-run the full `npm --workspace frontend run e2e -- --reporter=line`.
   - Outcome: All e2e tests clean, no duplicate logs/updates.
