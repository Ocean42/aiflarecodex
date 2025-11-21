import { useEffect, useRef } from "react";
import type {
  CliSummary,
  SessionId,
  SessionSummary,
  SessionMessage,
} from "@aiflare/protocol";
import { ProtoClient } from "./api/protoClient.js";
import { useLocalState } from "./hooks/useLocalState.js";
import { appState } from "./state/appState.js";
import {
  SessionFormSection,
  type SessionForm,
} from "./components/SessionFormSection.js";
import { AuthPanel } from "./components/AuthPanel.js";
import { LogPanel, type LogEntry } from "./components/LogPanel.js";
import type { AuthStatus } from "./types/auth.js";
import { SessionNavigator } from "./components/SessionNavigator.js";
import { SessionWorkspace } from "./components/SessionWorkspace.js";
import "dockview/dist/styles/dockview.css";
import "./styles.css";

type AppViewModel = {
  clis: Array<CliSummary>;
  sessions: Array<SessionSummary>;
  sessionMessages: Map<SessionId, Array<SessionMessage>>;
  form: SessionForm;
  logs: Array<LogEntry>;
  auth: AuthStatus | null;
  openSessionIds: Array<SessionId>;
  sync(): void;
  handleCreateSession(): Promise<void>;
  handleFormChange(field: keyof SessionForm, value: string): void;
  handleToggleSession(sessionId: SessionId): Promise<void>;
  addLog(message: string): void;
  refreshBackend(): Promise<void>;
  refreshAuthStatus(): Promise<void>;
  handleLogin(cliId: string): Promise<void>;
  handleLogout(): Promise<void>;
  handleCloseSession(sessionId: SessionId): void;
  openSession(sessionId: SessionId): Promise<void>;
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
  const [view] = useLocalState<AppViewModel>(({ self, reRender }) => {
    const vm: AppViewModel = Object.assign(self, {
      clis: [],
      sessions: [],
      sessionMessages: new Map<SessionId, Array<SessionMessage>>(),
      form: {
        cliId: "",
        workdir: "/tmp",
        model: "gpt-5.1-codex",
      },
      logs: [],
      auth: null,
      openSessionIds: [],
      sync() {
        vm.clis = Array.from(appState.clis.values());
        vm.sessions = Array.from(appState.sessions.values());
        vm.sessionMessages = new Map(appState.sessionMessages);
        vm.openSessionIds = [...appState.openSessionIds];
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
      async handleCreateSession() {
        if (vm.clis.length === 0) {
          alert("No CLI available. Pair one first.");
          return;
        }
        const targetCli = vm.form.cliId || vm.clis[0]?.id;
        if (!targetCli) {
          alert("No CLI selected.");
          return;
        }
        const { sessionId } = await client.createSession({
          cliId: targetCli,
          workdir: vm.form.workdir,
          model: vm.form.model,
        });
        vm.addLog(`[session] created ${sessionId}`);
        await refreshFromBackend();
        await vm.openSession(sessionId);
      },
      handleFormChange(field: keyof SessionForm, value: string) {
        vm.form = { ...vm.form, [field]: value };
        reRender();
      },
      async handleToggleSession(sessionId: SessionId) {
        if (vm.openSessionIds.includes(sessionId)) {
          vm.handleCloseSession(sessionId);
          return;
        }
        await vm.openSession(sessionId);
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
      async openSession(sessionId: SessionId) {
        appState.openSession(sessionId);
        vm.sync();
        reRender();
        vm.addLog(`[session] opening ${sessionId}`);
        try {
          const messages = await client.fetchSessionMessages(sessionId);
          appState.setSessionMessages(sessionId, messages);
          vm.sync();
          reRender();
          vm.addLog(
            `[session] loaded ${messages.length} messages for ${sessionId}`,
          );
        } catch (error) {
          console.error("[frontend] failed to load session messages", error);
          vm.addLog(`[session] failed to load messages for ${sessionId}`);
        }
      },
    });

    const refreshFromBackend = async (): Promise<void> => {
      const bootstrap = await client.fetchBootstrap();
      appState.setBootstrap(bootstrap);
      vm.sync();
      vm.addLog(
        `Synced backend state (clis=${bootstrap.clis.length}, sessions=${bootstrap.sessions.length})`,
      );
    };

    appState.subscribe(() => {
      vm.sync();
      reRender();
    });

    vm.sync();
    void vm.refreshBackend();
    void vm.refreshAuthStatus();

    return vm;
  });

  useEffect(() => {
    const unsubscribe = client.subscribeSessionEvents((event) => {
      switch (event.type) {
        case "session_messages_appended":
          appState.appendSessionMessages(event.sessionId, event.messages);
          break;
        case "session_summary_updated":
          appState.updateSession(event.summary);
          break;
        case "session_message_updated":
          appState.updateSessionMessage(event.sessionId, event.message);
          break;
        default:
          break;
      }
    });
    return () => {
      unsubscribe();
    };
  }, [client]);

  useEffect(() => {
    const timer = setInterval(() => {
      void view.refreshAuthStatus();
    }, 15000);
    return () => clearInterval(timer);
  }, [view]);

  return (
    <main className="app-shell">
      <h1>Aiflare Session Console</h1>
      <AuthPanel
        status={view.auth}
        clis={view.clis}
        pendingLogins={view.auth?.pendingLogins ?? []}
        onLogin={(cliId) => view.handleLogin(cliId)}
        onLogout={() => view.handleLogout()}
      />
      <div className="app-body">
        <div className="sidebar">
          <SessionFormSection
            form={view.form}
            clis={view.clis}
            onFormChange={(field, value) => view.handleFormChange(field, value)}
            onCreate={() => void view.handleCreateSession()}
          />
          <SessionNavigator
            sessions={view.sessions}
            openSessionIds={view.openSessionIds}
            messagesBySession={view.sessionMessages}
            onSelect={(sessionId) => void view.handleToggleSession(sessionId)}
          />
        </div>
        <div className="session-window-panel">
          <SessionWorkspace
            client={client}
            sessions={view.sessions}
            openSessionIds={view.openSessionIds}
            messagesBySession={view.sessionMessages}
          />
        </div>
      </div>
      <LogPanel logs={view.logs} />
    </main>
  );
}
