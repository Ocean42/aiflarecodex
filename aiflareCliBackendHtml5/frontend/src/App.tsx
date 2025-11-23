import { useEffect, useRef, useState } from "react";
import type {
  CliSummary,
  SessionEvent,
  SessionId,
  SessionSummary,
} from "@aiflare/protocol";
import { ProtoClient } from "./api/protoClient.js";
import { useLocalState } from "./hooks/useLocalState.js";
import { appState } from "./state/appState.js";
import { TopBar } from "./components/TopBar.js";
import {
  type SessionForm,
} from "./components/SessionFormSection.js";
import { AuthPanel } from "./components/AuthPanel.js";
import type { LogEntry } from "./components/LogPanel.js";
import type { AuthStatus } from "./types/auth.js";
import { SessionWorkspace } from "./components/SessionWorkspace.js";
import { SessionEventsController } from "./controllers/sessionEventsController.js";
import { deriveSessionTitle } from "./utils/sessionTitle.js";
import "dockview/dist/styles/dockview.css";
import "./styles.css";

type AppViewModel = {
  clis: Array<CliSummary>;
  sessions: Array<SessionSummary>;
  sessionTimeline: Map<SessionId, Array<SessionEvent>>;
  form: SessionForm;
  logs: Array<LogEntry>;
  auth: AuthStatus | null;
  openSessionIds: Array<SessionId>;
  minimizedSessionIds: Array<SessionId>;
  sync(): void;
  addLog(message: string): void;
  refreshBackend(): Promise<void>;
  refreshAuthStatus(): Promise<void>;
  handleLogin(cliId: string): Promise<void>;
  handleLogout(): Promise<void>;
  handleCloseSession(sessionId: SessionId): void;
  handleCreateSessionWithForm(form: SessionForm): Promise<SessionId | null>;
  openSession(sessionId: SessionId): Promise<void>;
  handleRestoreSession(sessionId: SessionId): Promise<void>;
};

function resolveBackendUrl(): string {
  const globalOverride =
    typeof globalThis === "object" && globalThis
      ? (globalThis as typeof globalThis & { __AIFLARE_BACKEND_URL?: string })
          .__AIFLARE_BACKEND_URL
      : undefined;
  if (globalOverride && globalOverride.length > 0) {
    return globalOverride;
  }
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const queryOverride = params.get("backendUrl") ?? params.get("backend_url");
    if (queryOverride && queryOverride.length > 0) {
      return queryOverride;
    }
  }
  return import.meta.env.VITE_BACKEND_URL ?? "http://127.0.0.1:4310";
}

export function App(): JSX.Element {
  const backendUrl = resolveBackendUrl();
  const clientRef = useRef<ProtoClient>();
  if (!clientRef.current) {
    clientRef.current = new ProtoClient(backendUrl);
  }
  const client = clientRef.current;
  const sseControllerRef = useRef<SessionEventsController>();
  if (!sseControllerRef.current) {
    sseControllerRef.current = new SessionEventsController(client);
  }
  const [view] = useLocalState<AppViewModel>(({ self, reRender }) => {
    const vm: AppViewModel = Object.assign(self, {
      clis: [],
      sessions: [],
      sessionTimeline: new Map<SessionId, Array<SessionEvent>>(),
      form: {
        cliId: "",
        workdir: "/tmp",
        model: "gpt-5.1-codex",
      },
      logs: [],
      auth: null,
      openSessionIds: [],
      minimizedSessionIds: [],
      sync() {
        vm.clis = Array.from(appState.clis.values());
        vm.sessions = Array.from(appState.sessions.values());
        vm.sessionTimeline = new Map(appState.sessionTimeline);
        vm.openSessionIds = [...appState.openSessionIds];
        vm.minimizedSessionIds = [...appState.minimizedSessionIds];
      },
      addLog(message: string) {
        const entry: LogEntry = {
          id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toISOString(),
          message,
        };
        vm.logs = [...vm.logs.slice(-49), entry];
        reRender();
      },
      async handleCreateSessionWithForm(form: SessionForm) {
        if (vm.clis.length === 0) {
          alert("No CLI available. Pair one first.");
          return null;
        }
        const targetCli = form.cliId || vm.clis[0]?.id;
        if (!targetCli) {
          alert("No CLI selected.");
          return null;
        }
        let sessionId: SessionId;
        try {
          ({ sessionId } = await client.createSession({
            cliId: targetCli,
            workdir: form.workdir,
            model: form.model,
          }));
        } catch (error) {
          console.error("[frontend] failed to create session", error);
          vm.addLog("[session] failed to create session");
          throw error;
        }
        const provisionalSummary: SessionSummary = {
          id: sessionId,
          cliId: targetCli,
          model: form.model,
          workdir: form.workdir,
          status: "waiting",
          lastUpdated: new Date().toISOString(),
          title: deriveSessionTitle(
            {
              id: sessionId,
              cliId: targetCli,
              model: form.model,
              workdir: form.workdir,
              status: "waiting",
              lastUpdated: new Date().toISOString(),
            },
            sessionId,
          ),
        };
        appState.updateSession(provisionalSummary);
        vm.addLog(`[session] created ${sessionId}`);
        return sessionId;
      },
      async refreshAuthStatus() {
        try {
          console.log("[frontend] fetching auth status...");
          const status = await client.fetchAuthStatus();
          vm.auth = status;
          vm.addLog(`[auth] status=${status.status}`);
        } catch (error) {
          console.error("[frontend] auth status fetch failed", error);
          vm.addLog("[auth] status fetch failed");
        } finally {
          reRender();
        }
      },
      async handleLogin(cliId: string) {
        if (!cliId) {
          alert("Select a CLI before requesting login.");
          return;
        }
        try {
          console.log("[frontend] requesting login link via CLI", cliId);
          await client.requestLogin(cliId);
          vm.addLog(`[auth] login link sent to ${cliId}`);
        } catch (error) {
          console.error("[frontend] login flow failed", error);
          vm.addLog("[auth] login link generation failed");
          alert(
            error instanceof Error
              ? error.message
              : "Failed to start Codex login. Check logs for details.",
          );
        }
        void vm.refreshAuthStatus();
        reRender();
      },
      async handleLogout() {
        try {
          console.log("[frontend] logging out of Codex...");
          await client.logout();
          vm.addLog("[auth] logged out");
          alert("Logged out of Codex. Local auth.json removed.");
        } catch (error) {
          console.error("[frontend] logout failed", error);
          vm.addLog("[auth] logout failed");
          alert("Failed to log out of Codex. Check logs for details.");
        }
        void vm.refreshAuthStatus();
        reRender();
      },
      refreshBackend: async () => {
        await refreshFromBackend();
      },
      handleCloseSession(sessionId: SessionId) {
        if (!vm.openSessionIds.includes(sessionId)) {
          return;
        }
        vm.addLog(`[session] closing ${sessionId}`);
        appState.closeSession(sessionId);
        vm.sync();
        reRender();
      },
      async handleRestoreSession(sessionId: SessionId) {
        await vm.openSession(sessionId);
      },
      async openSession(sessionId: SessionId) {
        appState.openSession(sessionId);
        vm.sync();
        reRender();
        vm.addLog(`[session] opening ${sessionId}`);
        try {
          const timeline = await client.fetchSessionTimeline(sessionId);
          appState.setSessionTimeline(sessionId, timeline);
          vm.sync();
          reRender();
          vm.addLog(
            `[session] loaded ${timeline.length} events for ${sessionId}`,
          );
        } catch (error) {
          console.error("[frontend] failed to load session timeline", error);
          vm.addLog(`[session] failed to load timeline for ${sessionId}`);
        }
      },
    });

    const refreshFromBackend = async (): Promise<void> => {
      try {
        console.log("[frontend] fetching bootstrap");
        const bootstrap = await client.fetchBootstrap();
        console.log("[frontend] bootstrap result", bootstrap);
        appState.setBootstrap(bootstrap);
        vm.sync();
        vm.addLog(
          `Synced backend state (clis=${bootstrap.clis.length}, sessions=${bootstrap.sessions.length})`,
        );
      } catch (error) {
        console.error("[frontend] failed to fetch bootstrap", error);
        vm.addLog("[bootstrap] failed to sync backend");
      }
    };

    appState.subscribe(() => {
      vm.sync();
      reRender();
    });

    vm.sync();
    console.log("[frontend] calling refreshBackend");
    void vm.refreshBackend();
    void vm.refreshAuthStatus();

    return vm;
  });

  useEffect(() => {
    sseControllerRef.current?.start();
    return () => sseControllerRef.current?.stop();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      void view.refreshAuthStatus();
    }, 15000);
    return () => clearInterval(timer);
  }, [view]);

  const [workspaceActions, setWorkspaceActions] = useState<{
    addSessionPanel(): void;
    addGroup(): void;
  } | null>(null);

  const renderLogsDialog = (): JSX.Element => {
    if (view.logs.length === 0) {
      return <p className="muted-text">No client logs yet.</p>;
    }
    return (
      <ul className="log-list-compact">
        {[...view.logs].reverse().map((log) => (
          <li key={log.id}>
            <span className="log-timestamp">
              {new Date(log.timestamp).toLocaleTimeString()}
            </span>
            <span className="log-message">{log.message}</span>
          </li>
        ))}
      </ul>
    );
  };

  const renderClisDialog = (): JSX.Element => (
    <ul className="cli-list">
      {view.clis.length === 0 ? (
        <li className="muted-text">No CLI connected.</li>
      ) : (
        view.clis.map((cli) => (
          <li key={cli.id} className="cli-list-item">
            <span className="cli-name">{cli.label ?? cli.id}</span>
            <span className="cli-id">{cli.id}</span>
            <span
              className={`cli-status cli-status-${cli.status}`}
              data-status={cli.status}
            >
              {cli.status}
            </span>
          </li>
        ))
      )}
    </ul>
  );

  const renderMinimizedSessionsDialog = (): JSX.Element => (
    <div className="dialog-empty-state">
      {view.minimizedSessionIds.length === 0 ? (
        <p className="muted-text">
          No minimized sessions yet. Close a docked session to see it here.
        </p>
      ) : (
        <ul className="minimized-list">
          {view.minimizedSessionIds.map((sessionId) => {
            const summary = view.sessions.find((s) => s.id === sessionId);
            return (
              <li key={sessionId} className="minimized-list-item">
                <div className="minimized-meta">
                  <span className="minimized-title">
                    {deriveSessionTitle(summary, sessionId)}
                  </span>
                  <span className="minimized-id">{sessionId}</span>
                </div>
                <button
                  type="button"
                  className="restore-button"
                  onClick={() => void view.handleRestoreSession(sessionId)}
                  data-testid={`restore-session-${sessionId}`}
                >
                  Restore
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  return (
    <main className="app-shell">
      <TopBar
        activeCliCount={view.clis.filter((cli) => cli.status === "connected").length}
        logsCount={view.logs.length}
        minimizedCount={view.minimizedSessionIds.length}
        authBadgeCount={view.auth?.loggedIn ? 1 : 0}
        authBadgeStatus={view.auth?.loggedIn ? "ok" : "warn"}
        renderClis={renderClisDialog}
        renderLogs={renderLogsDialog}
        renderMinimizedSessions={renderMinimizedSessionsDialog}
        renderAuth={() => (
          <div data-testid="auth-panel">
            <AuthPanel
              status={view.auth}
              clis={view.clis}
              pendingLogins={view.auth?.pendingLogins ?? []}
              onLogin={(cliId) => view.handleLogin(cliId)}
              onLogout={() => view.handleLogout()}
            />
          </div>
        )}
      />
      <div className="action-bar">
        <button
          type="button"
          className="action-bar-button"
          data-testid="workspace-add-session"
          onClick={() => {
            console.log("[app] action-bar add-session click", {
              hasActions: !!workspaceActions,
            });
            workspaceActions?.addSessionPanel();
          }}
          disabled={!workspaceActions}
        >
          + Session
        </button>
        <button
          type="button"
          className="action-bar-button"
          data-testid="workspace-add-group"
          onClick={() => {
            console.log("[app] action-bar add-group click", {
              hasActions: !!workspaceActions,
            });
            workspaceActions?.addGroup();
          }}
          disabled={!workspaceActions}
        >
          + Group
        </button>
      </div>
      <div className="app-body">
        <div className="session-window-panel">
          <SessionWorkspace
            client={client}
            sessions={view.sessions}
            openSessionIds={view.openSessionIds}
            timelineBySession={view.sessionTimeline}
            clis={view.clis}
            defaultForm={view.form}
            onCreateSession={(form) => view.handleCreateSessionWithForm(form)}
            onOpenSession={(sessionId) => view.openSession(sessionId)}
            onCloseSession={(sessionId) => view.handleCloseSession(sessionId)}
            onActionsChange={(actions) => {
              console.log("[app] workspace actions updated", {
                hasActions: !!actions,
              });
              setWorkspaceActions(actions);
            }}
          />
        </div>
      </div>
    </main>
  );
}
