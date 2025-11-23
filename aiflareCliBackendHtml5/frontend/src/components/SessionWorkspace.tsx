import { useEffect, useRef } from "react";
import type { ComponentProps, PointerEventHandler } from "react";
import type {
  CliSummary,
  SessionEvent,
  SessionId,
  SessionSummary,
} from "@aiflare/protocol";
import {
  DockviewDefaultTab,
  DockviewReact,
  type DockviewReadyEvent,
  type IDockviewPanelProps,
} from "dockview";
import type { ProtoClient } from "../api/protoClient.js";
import { SessionWindow } from "./SessionWindow.js";
import { SessionCreatorPanel } from "./SessionCreatorPanel.js";
import type { SessionForm } from "./SessionFormSection.js";
import { deriveSessionTitle } from "../utils/sessionTitle.js";
import { useLocalState } from "../hooks/useLocalState.js";
import {
  getSessionState,
  isSessionRunning,
  listenOnStateChanges,
  setSessionUnread,
  setSessionVisible,
} from "../state/sessionUpdateTracker.js";

type SessionPanelParams = {
  panelId: string;
  mode: "create" | "session";
  sessionId?: SessionId;
  clis: Array<CliSummary>;
  defaultForm: SessionForm;
  sessions: Array<SessionSummary>;
  openSessionIds: Array<SessionId>;
  timelineBySession: Map<SessionId, Array<SessionEvent>>;
};

type PanelMode = { mode: "create" } | { mode: "session"; sessionId: SessionId };

type WorkspaceLocalState = {
  badgeVersion: number;
  stateVersion: number;
  panelCounter: number;
  panelForSession: Map<SessionId, string>;
  panelModes: Map<string, PanelMode>;
  disposables: Array<{ dispose(): void }>;
  primaryGroupId: string | null;
  lastActiveSessionId: SessionId | null;
};

type Props = {
  client: ProtoClient;
  sessions: Array<SessionSummary>;
  openSessionIds: Array<SessionId>;
  timelineBySession: Map<SessionId, Array<SessionEvent>>;
  clis: Array<CliSummary>;
  defaultForm: SessionForm;
  onCreateSession(form: SessionForm): Promise<SessionId | null>;
  onOpenSession(sessionId: SessionId): Promise<void>;
  onCloseSession(sessionId: SessionId): void;
  onActionsChange?: (
    actions:
      | {
          addSessionPanel(): void;
          addGroup(): void;
        }
      | null,
  ) => void;
};

type SessionPanelProps = {
  panelProps: IDockviewPanelProps<SessionPanelParams>;
  client: ProtoClient;
  onCreateSession(form: SessionForm): Promise<SessionId | null>;
  onOpenSession(sessionId: SessionId): Promise<void>;
  onBecameSession(panelId: string, sessionId: SessionId): void;
};

function SessionPanel({
  panelProps,
  client,
  onCreateSession,
  onOpenSession,
  onBecameSession,
}: SessionPanelProps): JSX.Element {
  const { params } = panelProps;
  const mode: PanelMode =
    params.mode === "session" && params.sessionId
      ? { mode: "session", sessionId: params.sessionId }
      : { mode: "create" };

  const sessionsById = new Map<SessionId, SessionSummary>();
  params.sessions.forEach((session) => sessionsById.set(session.id, session));

  const timeline =
    mode.mode === "session" && mode.sessionId
      ? params.timelineBySession.get(mode.sessionId) ?? []
      : [];

  const isSessionOpen =
    mode.mode === "session" && !!mode.sessionId && params.openSessionIds.includes(mode.sessionId);

  async function handleCreate(form: SessionForm): Promise<void> {
    const createdId = await onCreateSession(form);
    if (!createdId) {
      throw new Error("Failed to create session");
    }
    const title = deriveSessionTitle(sessionsById.get(createdId), createdId);
    panelProps.api.setTitle(title);
    onBecameSession(panelProps.api.id, createdId);
    await onOpenSession(createdId);
  }

  if (mode.mode === "session" && mode.sessionId && isSessionOpen) {
    const summary = sessionsById.get(mode.sessionId);
    if (summary) {
      return (
        <SessionWindow
          client={client}
          sessionId={mode.sessionId}
          timeline={timeline}
        />
      );
    }
  }

  if (mode.mode === "session") {
    return (
      <div
        className="session-closed-placeholder"
        data-testid={`session-closed-${mode.sessionId ?? "unknown"}`}
      >
        Session closed
      </div>
    );
  }

  return (
    <SessionCreatorPanel
      clis={params.clis}
      initialForm={{
        cliId: params.defaultForm.cliId || params.clis[0]?.id || "",
        workdir: params.defaultForm.workdir,
        model: params.defaultForm.model,
      }}
      onCreate={(form) => handleCreate(form)}
    />
  );
}

export function SessionWorkspace({
  client,
  sessions,
  openSessionIds,
  timelineBySession,
  clis,
  defaultForm,
  onCreateSession,
  onOpenSession,
  onCloseSession,
  onActionsChange,
}: Props): JSX.Element {
  const apiRef = useRef<DockviewReadyEvent["api"]>();
  const [view, , reRender] = useLocalState<WorkspaceLocalState>(({ self }) => ({
    ...self,
    badgeVersion: 0,
    stateVersion: 0,
    panelCounter: 1,
    panelForSession: new Map<SessionId, string>(),
    panelModes: new Map<string, PanelMode>(),
    disposables: [],
    primaryGroupId: null,
    lastActiveSessionId: null,
  }));

  useEffect(() => {
    return () => {
      view.disposables.forEach((disposable) => disposable.dispose());
      view.disposables = [];
      onActionsChange?.(null);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = listenOnStateChanges(() => {
      view.badgeVersion += 1;
      view.stateVersion += 1;
      reRender();
    });
    return () => unsubscribe();
  }, [reRender, view]);

  const sessionLookup = new Map<SessionId, SessionSummary>();
  sessions.forEach((session) => sessionLookup.set(session.id, session));
  let timelineVersion = 0;
  timelineBySession.forEach((events) => {
    timelineVersion += events.length;
  });

  function markSessionSeen(sessionId: SessionId): void {
    setSessionUnread(sessionId, false);
  }

  function isSessionUnread(sessionId: SessionId): boolean {
    return getSessionState(sessionId).unread;
  }

  function buildPanelParams(panelId: string, mode: PanelMode): SessionPanelParams {
    return {
      panelId,
      mode: mode.mode,
      sessionId: mode.mode === "session" ? mode.sessionId : undefined,
      clis,
      defaultForm,
      sessions,
      openSessionIds,
      timelineBySession,
    };
  }

  function buildTabTitle(mode: PanelMode): string {
    if (mode.mode !== "session") {
      return "New Session";
    }
    const session = sessionLookup.get(mode.sessionId);
    const baseTitle = deriveSessionTitle(session, mode.sessionId);
    const state = getSessionState(mode.sessionId);
    const running = session?.status === "running" || state.running || isSessionRunning(mode.sessionId);
    const unread = state.unread || isSessionUnread(mode.sessionId);
    const spinner = running ? "⏳ " : "";
    const unreadLabel = unread ? "🟣 " : "";
    return `${spinner}${unreadLabel}${baseTitle}`;
  }

  function syncPanelData(): void {
    const api = apiRef.current;
    if (!api) {
      return;
    }
    for (const panel of api.panels) {
      const panelMode = view.panelModes.get(panel.id);
      if (!panelMode) {
        continue;
      }
      panel.update({ params: buildPanelParams(panel.id, panelMode) });
      if (panelMode.mode === "session") {
        const title = buildTabTitle(panelMode);
        if (panel.title !== title) {
          panel.setTitle(title);
        }
      }
    }
  }

  useEffect(() => {
    syncPanelData();
  }, [sessions, openSessionIds, timelineBySession, view.badgeVersion, timelineVersion]);

  function getActiveSessionId(): SessionId | null {
    const api = apiRef.current;
    if (!api) {
      return null;
    }
    const activePanel = api.activeGroup?.activePanel ?? api.activePanel;
    const mode = activePanel ? view.panelModes.get(activePanel.id) : undefined;
    return mode?.mode === "session" ? mode.sessionId : null;
  }

  function applyVisibility(activeSessionId: SessionId | null): void {
    view.panelModes.forEach((entry) => {
      if (entry.mode !== "session") {
        return;
      }
      const isActive = entry.sessionId === activeSessionId;
      if (isActive) {
        markSessionSeen(entry.sessionId);
      }
      setSessionVisible(entry.sessionId, isActive);
    });
    view.lastActiveSessionId = activeSessionId;
  }

  useEffect(() => {
    const activeSession = getActiveSessionId();
    applyVisibility(activeSession);
  }, [view.badgeVersion, view.stateVersion]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const activeSession = getActiveSessionId();
      applyVisibility(activeSession);
    }, 200);
    return () => window.clearInterval(interval);
  }, []);

  function syncActiveTabClasses(): void {
    const api = apiRef.current;
    if (!api) {
      return;
    }
    const activeGroupId = api.activeGroup?.id;
    api.groups.forEach((group) => {
      const tabs = group.element.querySelectorAll<HTMLElement>(".dv-tab");
      tabs.forEach((tab) => {
        if (group.id !== activeGroupId) {
          tab.classList.remove("dv-active-tab");
        }
      });
    });
  }

  function attachSessionToPanel(panelId: string, sessionId: SessionId): void {
    view.panelForSession.set(sessionId, panelId);
    view.panelModes.set(panelId, { mode: "session", sessionId });
  }

  function addPanel(panelMode: PanelMode, targetGroupId?: string): string | null {
    const api = apiRef.current;
    if (!api) {
      return null;
    }
    console.log("[workspace] addPanel begin", {
      mode: panelMode.mode,
      targetGroupId,
      groups: api.groups.map((g) => g.id),
      panels: api.panels.length,
    });
    const panelId = `panel-${view.panelCounter++}`;
    const params = buildPanelParams(panelId, panelMode);
    const refGroupId =
      api.activeGroup?.id ??
      view.primaryGroupId ??
      api.groups[0]?.id;
    if (!refGroupId && api.groups.length === 0) {
      const group = api.addGroup();
      group.api.setActive();
      view.primaryGroupId = group.id;
      return addPanel(panelMode, group.id);
    }
    const createPosition =
      targetGroupId != null
        ? { referenceGroup: targetGroupId }
        : panelMode.mode === "create" && api.groups.length > 0
          ? { referenceGroup: api.groups[api.groups.length - 1], direction: "below" as const }
          : refGroupId
            ? { referenceGroup: refGroupId }
            : undefined;
    const title = panelMode.mode === "session" ? buildTabTitle(panelMode) : "New Session";
    const created = api.addPanel({
      id: panelId,
      component: "sessionPanel",
      title,
      params,
      position: createPosition,
    });
    created.api.setActive();
    if (panelMode.mode === "session") {
      markSessionSeen(panelMode.sessionId);
      setSessionVisible(panelMode.sessionId, true);
      view.lastActiveSessionId = panelMode.sessionId;
    }
    api.layout(api.width, api.height, true);
    view.panelModes.set(panelId, panelMode);
    if (panelMode.mode === "session") {
      attachSessionToPanel(panelId, panelMode.sessionId);
    }
    console.log("[workspace] addPanel end", {
      id: panelId,
      mode: panelMode.mode,
      groups: api.groups.map((g) => g.id),
      panels: api.panels.length,
    });
    return panelId;
  }

  const addPanelRef = useRef<(mode: PanelMode, targetGroupId?: string) => string | null>();
  useEffect(() => {
    addPanelRef.current = addPanel;
  });

  function ensurePanelForSession(sessionId: SessionId): void {
    const api = apiRef.current;
    if (!api) {
      return;
    }
    const existingPanelId = view.panelForSession.get(sessionId);
    if (existingPanelId) {
      const existingPanel = api.getPanel(existingPanelId);
      if (existingPanel) {
        return;
      }
      view.panelForSession.delete(sessionId);
    }
    const panelId = addPanel({ mode: "session", sessionId });
    if (panelId) {
      const panel = api.getPanel(panelId);
      panel?.api.setActive();
      markSessionSeen(sessionId);
      setSessionVisible(sessionId, true);
    }
  }

  useEffect(() => {
    openSessionIds.forEach((sessionId) => {
      ensurePanelForSession(sessionId);
    });
  }, [openSessionIds]);

  function handleBecameSession(panelId: string, sessionId: SessionId): void {
    attachSessionToPanel(panelId, sessionId);
    const api = apiRef.current;
    const panel = api?.getPanel(panelId);
    if (panel) {
      panel.update({ params: buildPanelParams(panelId, { mode: "session", sessionId }) });
      panel.api.setActive();
      markSessionSeen(sessionId);
      setSessionVisible(sessionId, true);
    }
  }

  function handleAddPanelClick(): void {
    console.log("[workspace] add panel click");
    addPanelRef.current?.({ mode: "create" });
  }

  function handleAddPanelToGroup(groupId: string): void {
    console.log("[workspace] add panel to group", groupId);
    addPanelRef.current?.({ mode: "create" }, groupId);
  }

  function handleAddGroup(): void {
    console.log("[workspace] add group requested");
    const api = apiRef.current;
    if (!api) {
      console.warn("[workspace] addGroup blocked, api missing");
      return;
    }
    const group = api.addGroup();
    console.log("[workspace] group added", { id: group.id, count: api.groups.length });
    group.api.setActive();
    api.layout(api.width, api.height, true);
    if (!view.primaryGroupId) {
      view.primaryGroupId = group.id;
    }
  }

  const components = {
    sessionPanel: (panelProps: IDockviewPanelProps<SessionPanelParams>) => (
      <SessionPanel
        panelProps={panelProps}
        client={client}
        onCreateSession={onCreateSession}
        onOpenSession={onOpenSession}
        onBecameSession={handleBecameSession}
      />
    ),
  };
  const HeaderActions = ({ group }: { group: { id: string } }) => (
    <button
      type="button"
      className="dv-action-item"
      data-testid={`group-add-${group.id}`}
      aria-label="Add panel to group"
      onClick={() => handleAddPanelToGroup(group.id)}
    >
      +
    </button>
  );

  const Watermark = () => <div className="dockview-watermark"></div>;

  const SessionTab = (props: ComponentProps<typeof DockviewDefaultTab>) => {
    const handlePointerDown: PointerEventHandler<HTMLDivElement> = (event) => {
      const mode = view.panelModes.get(props.api.id);
      const sessionId = mode?.mode === "session" ? mode.sessionId : null;
      applyVisibility(sessionId);
      props.onPointerDown?.(event);
    };
    return <DockviewDefaultTab {...props} onPointerDown={handlePointerDown} />;
  };

  function handleReady(event: DockviewReadyEvent): void {
    console.log("[workspace] dockview ready, groups", event.api.groups.length);
    apiRef.current = event.api;
    view.disposables.forEach((disposable) => disposable.dispose());
    view.disposables = [];
    event.api.clear();
    view.primaryGroupId = null;
    view.lastActiveSessionId = null;
    sessions.forEach((session) => setSessionVisible(session.id, false));
    if (event.api.groups.length === 0) {
      const group = event.api.addGroup();
      group.api.setActive();
      view.primaryGroupId = group.id;
    }
    view.panelModes.clear();
    view.panelForSession.clear();
    const removeDisposable = event.api.onDidRemovePanel((panel) => {
      const mode = view.panelModes.get(panel.id);
      view.panelModes.delete(panel.id);
      if (mode?.mode === "session" && mode.sessionId) {
        if (view.panelForSession.get(mode.sessionId) === panel.id) {
          view.panelForSession.delete(mode.sessionId);
        }
        setSessionVisible(mode.sessionId, false);
        onCloseSession(mode.sessionId);
      }
    });
    const addDisposable = event.api.onDidAddPanel(() => {
      console.log("[workspace] panel added; panels", event.api.panels.length);
      reRender();
    });
    const activeDisposable = event.api.onDidActivePanelChange((panel) => {
      const mode = panel ? view.panelModes.get(panel.id) : undefined;
      const nextSessionId = mode?.mode === "session" ? mode.sessionId : null;
      applyVisibility(nextSessionId);
      syncActiveTabClasses();
    });
    const activeGroupDisposable = event.api.onDidActiveGroupChange(() => {
      console.log("[workspace] active group changed", {
        active: event.api.activeGroup?.id,
        groups: event.api.groups.map((g) => g.id),
      });
      const activeGroupSessionId =
        event.api.activeGroup?.activePanel
          ? (() => {
              const mode = view.panelModes.get(event.api.activeGroup!.activePanel.id);
              return mode?.mode === "session" ? mode.sessionId : null;
            })()
          : null;
      applyVisibility(activeGroupSessionId);
      syncActiveTabClasses();
    });
    view.disposables.push(removeDisposable, addDisposable, activeDisposable, activeGroupDisposable);
    syncActiveTabClasses();
    syncPanelData();
    onActionsChange?.({
      addSessionPanel: handleAddPanelClick,
      addGroup: handleAddGroup,
    });
  }

  return (
    <div className="session-workspace" data-testid="session-workspace">
      <DockviewReact
        components={components}
        defaultTabComponent={SessionTab}
        leftHeaderActionsComponent={HeaderActions}
        watermarkComponent={Watermark}
        onReady={handleReady}
      />
    </div>
  );
}
