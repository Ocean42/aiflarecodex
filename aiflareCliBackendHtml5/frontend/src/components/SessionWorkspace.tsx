import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  type IDockviewHeaderActionsProps,
  type IDockviewPanelProps,
} from "dockview";
import type { ProtoClient } from "../api/protoClient.js";
import { SessionWindow } from "./SessionWindow.js";
import { SessionCreatorPanel } from "./SessionCreatorPanel.js";
import type { SessionForm } from "./SessionFormSection.js";
import { deriveSessionTitle } from "../utils/sessionTitle.js";

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
};

function AddPanelButton({ onClick }: { onClick(): void }): JSX.Element {
  return (
    <button
      type="button"
      className="dockview-header-add"
      onClick={() => onClick()}
      data-testid="dockview-add-panel"
      aria-label="Add session panel"
    >
      +
    </button>
  );
}

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
  const [mode, setMode] = useState<PanelMode>(() =>
    params.mode === "session" && params.sessionId
      ? { mode: "session", sessionId: params.sessionId }
      : { mode: "create" },
  );

  useEffect(() => {
    if (params.mode === "session" && params.sessionId) {
      setMode((current) =>
        current.mode === "session" && current.sessionId === params.sessionId
          ? current
          : { mode: "session", sessionId: params.sessionId! },
      );
    } else if (params.mode === "create") {
      setMode((current) => (current.mode === "create" ? current : { mode: "create" }));
    }
  }, [params.mode, params.sessionId]);

  const sessionsById = useMemo(() => {
    const map = new Map<SessionId, SessionSummary>();
    params.sessions.forEach((session) => map.set(session.id, session));
    return map;
  }, [params.sessions]);

  const timeline =
    mode.mode === "session" && mode.sessionId
      ? params.timelineBySession.get(mode.sessionId) ?? []
      : [];

  const isSessionOpen =
    mode.mode === "session" &&
    !!mode.sessionId &&
    params.openSessionIds.includes(mode.sessionId);

  const handleCreate = useCallback(
    async (form: SessionForm) => {
      const createdId = await onCreateSession(form);
      if (!createdId) {
        throw new Error("Failed to create session");
      }
      setMode({ mode: "session", sessionId: createdId });
      const title = deriveSessionTitle(sessionsById.get(createdId), createdId);
      panelProps.api.setTitle(title);
      onBecameSession(panelProps.api.id, createdId);
      await onOpenSession(createdId);
    },
    [onBecameSession, onCreateSession, onOpenSession, panelProps.api, sessionsById],
  );

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
}: Props): JSX.Element {
  const apiRef = useRef<DockviewReadyEvent["api"]>();
  const panelCounterRef = useRef(1);
  const panelForSessionRef = useRef(new Map<SessionId, string>());
  const panelModesRef = useRef(new Map<string, PanelMode>());
  const disposablesRef = useRef<Array<{ dispose(): void }>>([]);
  const primaryGroupIdRef = useRef<string | null>(null);
  const [hasPanels, setHasPanels] = useState(false);

  useEffect(() => {
    return () => {
      disposablesRef.current.forEach((disposable) => disposable.dispose());
      disposablesRef.current = [];
    };
  }, []);

  const sessionLookup = useMemo(() => {
    const map = new Map<SessionId, SessionSummary>();
    sessions.forEach((session) => map.set(session.id, session));
    return map;
  }, [sessions]);

  const buildPanelParams = useCallback(
    (panelId: string, mode: PanelMode): SessionPanelParams => ({
      panelId,
      mode: mode.mode,
      sessionId: mode.mode === "session" ? mode.sessionId : undefined,
      clis,
      defaultForm,
      sessions,
      openSessionIds,
      timelineBySession,
    }),
    [clis, defaultForm, openSessionIds, sessions, timelineBySession],
  );

  const syncPanelData = useCallback(() => {
    const api = apiRef.current;
    if (!api) {
      return;
    }
    for (const panel of api.panels) {
      const panelMode = panelModesRef.current.get(panel.id);
      if (!panelMode) {
        continue;
      }
      panel.update({ params: buildPanelParams(panel.id, panelMode) });
      if (panelMode.mode === "session") {
        const title = deriveSessionTitle(
          sessionLookup.get(panelMode.sessionId),
          panelMode.sessionId,
        );
        if (panel.title !== title) {
          panel.setTitle(title);
        }
      }
    }
  }, [buildPanelParams, sessionLookup]);

  useEffect(() => {
    syncPanelData();
  }, [syncPanelData]);

  const attachSessionToPanel = useCallback((panelId: string, sessionId: SessionId) => {
    panelForSessionRef.current.set(sessionId, panelId);
    panelModesRef.current.set(panelId, { mode: "session", sessionId });
  }, []);

  const addPanel = useCallback(
    (panelMode: PanelMode): string | null => {
      const api = apiRef.current;
      if (!api) {
        return null;
      }
      const panelId = `panel-${panelCounterRef.current++}`;
      const params = buildPanelParams(panelId, panelMode);
      const createPosition =
        panelMode.mode === "create" && api.groups.length > 0
          ? {
              referenceGroup: api.groups[api.groups.length - 1],
              direction: "below" as const,
            }
          : undefined;
      const title =
        panelMode.mode === "session"
          ? deriveSessionTitle(sessionLookup.get(panelMode.sessionId), panelMode.sessionId)
          : "New Session";
      const created = api.addPanel({
        id: panelId,
        component: "sessionPanel",
        title,
        params,
        position: createPosition,
      });
      created.api.setActive();
      api.layout(api.width, api.height, true);
      panelModesRef.current.set(panelId, panelMode);
      if (panelMode.mode === "session") {
        attachSessionToPanel(panelId, panelMode.sessionId);
      }
      setHasPanels(true);
      return panelId;
    },
    [attachSessionToPanel, buildPanelParams, sessionLookup],
  );
  const addPanelRef = useRef(addPanel);
  useEffect(() => {
    addPanelRef.current = addPanel;
  }, [addPanel]);

  const ensurePanelForSession = useCallback(
    (sessionId: SessionId) => {
      const api = apiRef.current;
      if (!api) {
        return;
      }
      const existingPanelId = panelForSessionRef.current.get(sessionId);
      if (existingPanelId) {
        const existingPanel = api.getPanel(existingPanelId);
        if (existingPanel) {
          existingPanel.api.setActive();
          return;
        }
        panelForSessionRef.current.delete(sessionId);
      }
      const panelId = addPanel({ mode: "session", sessionId });
      if (panelId) {
        const panel = api.getPanel(panelId);
        panel?.api.setActive();
      }
    },
    [addPanel],
  );

  useEffect(() => {
    openSessionIds.forEach((sessionId) => {
      ensurePanelForSession(sessionId);
    });
  }, [ensurePanelForSession, openSessionIds]);

  const handleBecameSession = useCallback(
    (panelId: string, sessionId: SessionId) => {
      attachSessionToPanel(panelId, sessionId);
      const api = apiRef.current;
      const panel = api?.getPanel(panelId);
      if (panel) {
        panel.update({ params: buildPanelParams(panelId, { mode: "session", sessionId }) });
        panel.api.setActive();
      }
    },
    [attachSessionToPanel, buildPanelParams],
  );

  const handleAddPanelClick = useCallback(() => {
    addPanelRef.current?.({ mode: "create" });
  }, []);

  const components = useMemo(
    () => ({
      sessionPanel: (panelProps: IDockviewPanelProps<SessionPanelParams>) => (
        <SessionPanel
          panelProps={panelProps}
          client={client}
          onCreateSession={onCreateSession}
          onOpenSession={onOpenSession}
          onBecameSession={handleBecameSession}
        />
      ),
    }),
    [client, handleBecameSession, onCreateSession, onOpenSession],
  );

  const headerActionsComponent = useMemo(
    () =>
      function HeaderActions(props: IDockviewHeaderActionsProps): JSX.Element | null {
        if (!primaryGroupIdRef.current) {
          primaryGroupIdRef.current = props.group.id;
        }
        if (primaryGroupIdRef.current !== props.group.id) {
          return null;
        }
        return <AddPanelButton onClick={handleAddPanelClick} />;
      },
    [handleAddPanelClick],
  );

  const watermarkComponent = useMemo(
    () =>
      function Watermark(): JSX.Element {
        return (
          <div className="dockview-watermark">
            <div className="workspace-placeholder">
              Click + to create a new session.
            </div>
          </div>
        );
      },
    [],
  );

  const handleReady = useCallback(
    (event: DockviewReadyEvent) => {
      apiRef.current = event.api;
      disposablesRef.current.forEach((disposable) => disposable.dispose());
      disposablesRef.current = [];
      event.api.clear();
      primaryGroupIdRef.current = null;
      if (event.api.groups.length === 0) {
        const group = event.api.addGroup();
        group.api.setActive();
        primaryGroupIdRef.current = group.id;
      }
      panelModesRef.current.clear();
      panelForSessionRef.current.clear();
      setHasPanels(false);
      const removeDisposable = event.api.onDidRemovePanel((panel) => {
        const mode = panelModesRef.current.get(panel.id);
        panelModesRef.current.delete(panel.id);
        if (mode?.mode === "session" && mode.sessionId) {
          if (panelForSessionRef.current.get(mode.sessionId) === panel.id) {
            panelForSessionRef.current.delete(mode.sessionId);
          }
          onCloseSession(mode.sessionId);
        }
        setHasPanels((event.api.panels.length ?? 0) > 0);
        if (event.api.panels.length === 0) {
          event.api.clear();
          panelModesRef.current.clear();
          panelForSessionRef.current.clear();
          primaryGroupIdRef.current = null;
          if (event.api.groups.length === 0) {
            const group = event.api.addGroup();
            group.api.setActive();
            primaryGroupIdRef.current = group.id;
          }
        }
      });
      const addDisposable = event.api.onDidAddPanel(() => {
        setHasPanels((event.api.panels.length ?? 0) > 0);
      });
      disposablesRef.current.push(removeDisposable, addDisposable);
      setHasPanels(event.api.panels.length > 0);
      syncPanelData();
    },
    [onCloseSession, syncPanelData],
  );

  return (
    <div className="session-workspace" data-testid="session-workspace">
      <DockviewReact
        hideBorders
        components={components}
        defaultTabComponent={DockviewDefaultTab}
        leftHeaderActionsComponent={headerActionsComponent}
        watermarkComponent={watermarkComponent}
        onReady={handleReady}
      />
    </div>
  );
}
