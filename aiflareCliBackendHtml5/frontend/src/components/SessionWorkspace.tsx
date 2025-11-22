import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CliSummary,
  SessionEvent,
  SessionId,
  SessionSummary,
} from "@aiflare/protocol";
import {
  DockviewReact,
  type DockviewReadyEvent,
  type IDockviewPanelProps,
} from "dockview";
import type { ProtoClient } from "../api/protoClient.js";
import { SessionWindow } from "./SessionWindow.js";
import { SessionCreatorPanel } from "./SessionCreatorPanel.js";
import type { SessionForm } from "./SessionFormSection.js";
import { deriveSessionTitle } from "../utils/sessionTitle.js";

type SessionPanelParams = {
  mode: "create" | "session";
  form?: SessionForm;
  clis?: Array<CliSummary>;
  sessionId?: SessionId;
  timeline?: Array<SessionEvent>;
};

type PanelState =
  | { id: string; mode: "create"; form: SessionForm }
  | { id: string; mode: "session"; sessionId: SessionId };

type Props = {
  client: ProtoClient;
  sessions: Array<SessionSummary>;
  openSessionIds: Array<SessionId>;
  timelineBySession: Map<SessionId, Array<SessionEvent>>;
  clis: Array<CliSummary>;
  defaultForm: SessionForm;
  onCreateSession(form: SessionForm): Promise<SessionId | null>;
  onCloseSession(sessionId: SessionId): void;
};

export function SessionWorkspace({
  client,
  sessions,
  openSessionIds,
  timelineBySession,
  clis,
  defaultForm,
  onCreateSession,
  onCloseSession,
}: Props): JSX.Element {
  const apiRef = useRef<DockviewReadyEvent["api"]>();
  const disposablesRef = useRef<Array<{ dispose(): void }>>([]);
  const [panelStates, setPanelStates] = useState<Array<PanelState>>([]);
  const panelStatesRef = useRef<Array<PanelState>>([]);
  panelStatesRef.current = panelStates;
  const removalBySyncRef = useRef<Set<string>>(new Set());
  const nextCreateIdRef = useRef(1);

  useEffect(() => {
    return () => {
      disposablesRef.current.forEach((disposable) => disposable.dispose());
      disposablesRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (clis.length === 0) {
      return;
    }
    setPanelStates((list) =>
      list.map((panel) => {
        if (panel.mode === "create" && !panel.form.cliId && clis[0]?.id) {
          return { ...panel, form: { ...panel.form, cliId: clis[0]!.id } };
        }
        return panel;
      }),
    );
  }, [clis]);

  useEffect(() => {
    console.log("[session-workspace] clis update", clis.map((cli) => cli.id));
  }, [clis]);

  const components = useMemo(
    () => ({
      sessionPanel: (panelProps: IDockviewPanelProps<SessionPanelParams>) => {
        if (panelProps.params.mode === "create") {
          return (
            <SessionCreatorPanel
              clis={panelProps.params.clis ?? []}
              initialForm={
                panelProps.params.form ?? {
                  cliId: clis[0]?.id ?? "",
                  workdir: defaultForm.workdir,
                  model: defaultForm.model,
                }
              }
              onCreate={async (form) => {
                const createdId = await onCreateSession(form);
                if (!createdId) {
                  throw new Error("Failed to create session");
                }
                console.log("[session-workspace] creator success", createdId, "panel", panelProps.api.id);
                setPanelStates((list) =>
                  list.map((panel) =>
                    panel.id === panelProps.api.id
                      ? { id: createdId, mode: "session", sessionId: createdId }
                      : panel.id === createdId
                        ? { ...panel, mode: "session", sessionId: createdId }
                        : panel,
                  ),
                );
              }}
            />
          );
        }
        if (panelProps.params.mode === "session" && panelProps.params.sessionId) {
          console.log("[session-workspace] render session panel", panelProps.params.sessionId);
          return (
            <SessionWindow
              client={client}
              sessionId={panelProps.params.sessionId}
              timeline={panelProps.params.timeline ?? []}
            />
          );
        }
        return <div />;
      },
    }),
    [client, clis, defaultForm, onCreateSession],
  );

  const sessionLookup = useMemo(() => {
    const map = new Map<SessionId, SessionSummary>();
    sessions.forEach((session) => map.set(session.id, session));
    return map;
  }, [sessions]);

  const addCreationPanel = useCallback(() => {
    const nextId = `new-${nextCreateIdRef.current++}`;
    setPanelStates((list) => [
      ...list,
      {
        id: nextId,
        mode: "create",
        form: {
          cliId: defaultForm.cliId || clis[0]?.id || "",
          workdir: defaultForm.workdir,
          model: defaultForm.model,
        },
      },
    ]);
  }, [clis, defaultForm]);

  const syncPanels = useCallback(() => {
    const api = apiRef.current;
    if (!api) {
      return;
    }
    const panelMap = new Map(panelStates.map((panel) => [panel.id, panel]));
    for (const panel of [...api.panels]) {
      if (!panelMap.has(panel.id)) {
        removalBySyncRef.current.add(panel.id);
        api.removePanel(panel);
      }
    }
    for (const state of panelStates) {
      const params: SessionPanelParams =
        state.mode === "create"
          ? {
              mode: "create",
              form: state.form,
              clis,
            }
          : {
              mode: "session",
              sessionId: state.sessionId,
              timeline: timelineBySession.get(state.sessionId) ?? [],
            };
      const title =
        state.mode === "session"
          ? deriveSessionTitle(sessionLookup.get(state.sessionId), state.sessionId)
          : "New Session";
      let panel = api.getPanel(state.id);
      let created = false;
      if (!panel) {
        const existingGroups = api.groups;
        const position =
          existingGroups.length > 0
            ? {
                referenceGroup: existingGroups[existingGroups.length - 1],
                direction: "right" as const,
              }
            : undefined;
        api.addPanel({
          id: state.id,
          component: "sessionPanel",
          title,
          params,
          position,
        });
        panel = api.getPanel(state.id);
        created = true;
      }
      if (panel) {
        if (panel.title !== title) {
          panel.setTitle(title);
        }
        panel.update({ params });
        if (created) {
          panel.api.setActive();
        }
      }
    }
    if (panelStates.length === 0) {
      api.closeAllGroups();
    }
  }, [panelStates, timelineBySession, sessionLookup, clis]);

  useEffect(() => {
    syncPanels();
  }, [syncPanels]);

  useEffect(() => {
    if (panelStates.length === 0) {
      addCreationPanel();
    }
  }, [addCreationPanel, panelStates.length]);

  useEffect(() => {
    setPanelStates((list) => {
      const next = list.filter(
        (panel) => panel.mode !== "session" || openSessionIds.includes(panel.sessionId),
      );
      for (const sessionId of openSessionIds) {
        if (!next.some((panel) => panel.mode === "session" && panel.sessionId === sessionId)) {
          next.push({ id: sessionId, mode: "session", sessionId });
        }
      }
      return next;
    });
  }, [openSessionIds]);

  const handleReady = useCallback(
    (event: DockviewReadyEvent) => {
      apiRef.current = event.api;
      disposablesRef.current.forEach((disposable) => disposable.dispose());
      disposablesRef.current = [];
      const removeDisposable = event.api.onDidRemovePanel((panel) => {
        const id = panel.id as string;
        const state = panelStatesRef.current.find((item) => item.id === id);
        if (removalBySyncRef.current.delete(id)) {
          setPanelStates((list) => list.filter((item) => item.id !== id));
          return;
        }
        if (state?.mode === "create") {
          setPanelStates((list) => list.filter((item) => item.id !== id));
          return;
        }
        if (state?.mode === "session") {
          setPanelStates((list) => list.filter((item) => item.id !== id));
          onCloseSession(state.sessionId);
        }
      });
      disposablesRef.current.push(removeDisposable);
      syncPanels();
    },
    [onCloseSession, syncPanels],
  );

  return (
    <div className="session-workspace" data-testid="session-workspace">
      <button
        type="button"
        className="dockview-add-button"
        onClick={() => addCreationPanel()}
        data-testid="dockview-add-panel"
      >
        +
      </button>
      <DockviewReact hideBorders components={components} onReady={handleReady} />
      {panelStates.length === 0 ? (
        <div className="workspace-placeholder">
          Click + to create a new session.
        </div>
      ) : null}
    </div>
  );
}
