import { useCallback, useEffect, useMemo, useRef } from "react";
import type {
  SessionId,
  SessionMessage,
  SessionSummary,
} from "@aiflare/protocol";
import {
  DockviewReact,
  type DockviewReadyEvent,
  type IDockviewPanelProps,
} from "dockview";
import type { ProtoClient } from "../api/protoClient.js";
import { SessionWindow } from "./SessionWindow.js";

type SessionPanelParams = {
  sessionId: SessionId;
  messages: Array<SessionMessage>;
};

type Props = {
  client: ProtoClient;
  sessions: Array<SessionSummary>;
  openSessionIds: Array<SessionId>;
  messagesBySession: Map<SessionId, Array<SessionMessage>>;
};

export function SessionWorkspace({
  client,
  sessions,
  openSessionIds,
  messagesBySession,
}: Props): JSX.Element {
  const apiRef = useRef<DockviewReadyEvent["api"]>();
  const disposablesRef = useRef<Array<{ dispose(): void }>>([]);

  useEffect(() => {
    return () => {
      disposablesRef.current.forEach((disposable) => disposable.dispose());
      disposablesRef.current = [];
    };
  }, []);

  const components = useMemo(
    () => ({
      sessionWindow: (panelProps: IDockviewPanelProps<SessionPanelParams>) => (
        <SessionWindow
          client={client}
          sessionId={panelProps.params.sessionId}
          messages={panelProps.params.messages}
        />
      ),
    }),
    [client],
  );

  const sessionLookup = useMemo(() => {
    const map = new Map<SessionId, SessionSummary>();
    sessions.forEach((session) => map.set(session.id, session));
    return map;
  }, [sessions]);

  const syncPanels = useCallback(() => {
    const api = apiRef.current;
    if (!api) {
      return;
    }
    const openSet = new Set(openSessionIds);
    for (const panel of [...api.panels]) {
      if (!openSet.has(panel.id as SessionId)) {
        api.removePanel(panel);
      }
    }
    for (const sessionId of openSessionIds) {
      const params: SessionPanelParams = {
        sessionId,
        messages: messagesBySession.get(sessionId) ?? [],
      };
      const title = sessionLookup.get(sessionId)?.title ?? sessionId;
      let panel = api.getPanel(sessionId);
      let created = false;
      if (!panel) {
        api.addPanel({
          id: sessionId,
          component: "sessionWindow",
          title,
          params,
        });
        panel = api.getPanel(sessionId);
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
    if (openSessionIds.length === 0) {
      api.closeAllGroups();
    }
  }, [openSessionIds, messagesBySession, sessionLookup]);

  useEffect(() => {
    syncPanels();
  }, [syncPanels]);

  const handleReady = useCallback(
    (event: DockviewReadyEvent) => {
      apiRef.current = event.api;
      disposablesRef.current.forEach((disposable) => disposable.dispose());
      disposablesRef.current = [];
      syncPanels();
    },
    [syncPanels],
  );

  return (
    <div className="session-workspace" data-testid="session-workspace">
      <DockviewReact hideBorders components={components} onReady={handleReady} />
      {openSessionIds.length === 0 ? (
        <div className="workspace-placeholder">
          Select a session to start chatting.
        </div>
      ) : null}
    </div>
  );
}
