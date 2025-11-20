import { useEffect } from "react";
import type { CliSummary, SessionSummary } from "@aiflare/protocol";
import { ProtoClient } from "./api/protoClient.js";
import { useLocalState } from "./hooks/useLocalState.js";
import { appState } from "./state/appState.js";
import { CliSection } from "./components/CliSection.js";
import {
  SessionFormSection,
  type SessionForm,
} from "./components/SessionFormSection.js";
import { PendingActionsSection } from "./components/PendingActionsSection.js";
import { SessionHistorySection } from "./components/SessionHistorySection.js";
import { LogPanel, type LogEntry } from "./components/LogPanel.js";
import { StatsSummary } from "./components/StatsSummary.js";
import { AuthPanel } from "./components/AuthPanel.js";
import type { AuthStatus } from "./types/auth.js";

type AppViewModel = {
  cliCount: number;
  sessionCount: number;
  clis: Array<CliSummary>;
  sessions: Array<SessionSummary>;
  actions: Array<{ actionId: string; cliId: string; sessionId?: string; payload: unknown }>;
  form: SessionForm;
  history: Array<{ timestamp: string; event: string; data?: unknown }>;
  logs: Array<LogEntry>;
  auth: AuthStatus | null;
  sync(): void;
  handlePairCli(): Promise<void>;
  handleEnqueueAction(): Promise<void>;
  handleCreateSession(): Promise<void>;
  handleFormChange(field: keyof SessionForm, value: string): void;
  loadHistory(sessionId: string): Promise<void>;
  addLog(message: string): void;
  refreshBackend(): Promise<void>;
  refreshAuthStatus(): Promise<void>;
  handleLogin(cliId: string): Promise<void>;
  handleLogout(): Promise<void>;
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
  const [view] = useLocalState<AppViewModel>(({ self, reRender }) => {
    const client = new ProtoClient(resolveBackendUrl());

    const vm: AppViewModel = Object.assign(self, {
      cliCount: 0,
      sessionCount: 0,
      clis: [],
      sessions: [],
      actions: [],
      form: {
        cliId: "",
        workdir: "/tmp",
        model: "gpt-4.1-mini",
      },
      history: [],
      logs: [],
      auth: null,
      sync() {
        vm.clis = Array.from(appState.clis.values());
        vm.sessions = Array.from(appState.sessions.values());
        vm.actions = Array.from(appState.actions);
        vm.cliCount = vm.clis.length;
        vm.sessionCount = vm.sessions.length;
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
      async handlePairCli() {
        await client.pairCli();
        await refreshFromBackend();
      },
      async handleEnqueueAction() {
        if (vm.clis.length === 0) {
          alert("No CLI available. Pair one first.");
          return;
        }
        const targetCli = vm.form.cliId || vm.clis[0]?.id;
        if (!targetCli) {
          return;
        }
        await client.enqueueSampleAction(targetCli, vm.form.cliId);
        await refreshFromBackend();
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
        await client.createSession({
          cliId: targetCli,
          workdir: vm.form.workdir,
          model: vm.form.model,
        });
        await refreshFromBackend();
      },
      handleFormChange(field: keyof SessionForm, value: string) {
        vm.form = { ...vm.form, [field]: value };
        reRender();
      },
      async loadHistory(sessionId: string) {
        const history = await client.fetchSessionHistory(sessionId);
        vm.history = history;
        reRender();
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
    });

    const refreshFromBackend = async (): Promise<void> => {
      const { clis, sessions, actions } = await client.fetchBootstrap();
      clis.forEach((cli) => appState.updateCli(cli));
      sessions.forEach((session) => appState.updateSession(session));
      appState.setActions(actions);
      console.log("refreshFromBackend", { cliCount: clis.length, sessionCount: sessions.length });
      vm.sync();
      vm.addLog(
        `Synced backend state (clis=${clis.length}, sessions=${sessions.length}, actions=${actions.length})`,
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
    const timer = setInterval(() => {
      void view.refreshBackend();
      void view.refreshAuthStatus();
    }, 5000);
    return () => clearInterval(timer);
  }, [view]);

  return (
    <main>
      <h1>Aiflare Frontend</h1>
      <StatsSummary cliCount={view.cliCount} sessionCount={view.sessionCount} />
      <AuthPanel
        status={view.auth}
        clis={view.clis}
        pendingLogins={view.auth?.pendingLogins ?? []}
        onLogin={(cliId) => view.handleLogin(cliId)}
        onLogout={() => view.handleLogout()}
      />
      <CliSection
        clis={view.clis}
        onPair={() => void view.handlePairCli()}
        onEnqueue={() => void view.handleEnqueueAction()}
      />
      <SessionFormSection
        form={view.form}
        clis={view.clis}
        sessions={view.sessions}
        onFormChange={(field, value) => view.handleFormChange(field, value)}
        onCreate={() => void view.handleCreateSession()}
        onLoadHistory={(sessionId) => void view.loadHistory(sessionId)}
      />
      <PendingActionsSection actions={view.actions} />
      <SessionHistorySection history={view.history} />
      <LogPanel logs={view.logs} />
    </main>
  );
}
