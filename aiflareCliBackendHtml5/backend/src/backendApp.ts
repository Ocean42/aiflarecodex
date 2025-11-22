import express, { type Express } from "express";
import cors from "cors";
import type { Server } from "node:http";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import type {
  BootstrapState,
  CliId,
  CliSummary,
  SessionEvent,
  SessionId,
  SessionSummary,
} from "@aiflare/protocol";
import {
  getAuthStatus,
  initializeAuthState,
  logoutAuthState,
} from "./services/authState.js";
import { logToFile } from "./services/logWriter.js";
import { persistAuthData } from "./services/authStorage.js";
import {
  SessionStore,
  type SessionEventDraft,
  type SessionStoreEvent,
} from "./services/sessionStore.js";
import {
  SessionRunnerService,
  type SessionRuntimeFactory,
} from "./services/sessionRunner.js";
import { createAgentLoopRuntimeFactory } from "./utils/agent/runtime.js";
import { ToolResultBroker } from "./services/toolResultBroker.js";
import {
  createToolExecutorFactory,
  type ToolExecutorFactory,
} from "./services/toolExecutorFactory.js";
import { getAuthFilePath, getSessionsRoot } from "./utils/codexHome.js";

type CliRecord = CliSummary & { token: string };

type ActionEntry = {
  actionId: string;
  cliId: CliId;
  sessionId?: SessionId;
  payload: unknown;
  delivered: boolean;
};

export interface BackendAppOptions {
  port?: number;
  sessionStoreDir?: string;
}

export class BackendApp {
  private readonly port: number;
  private app: Express | null = null;
  server: Server | null = null;
  private readonly clis = new Map<CliId, CliRecord>();
  private readonly actionQueue: Array<ActionEntry> = [];
  private readonly pendingLoginClis = new Set<CliId>();
  private readonly sessionStore: SessionStore;
  private readonly sessionRunner: SessionRunnerService;
  private readonly toolResultBroker = new ToolResultBroker();
  private readonly toolExecutorFactory: ToolExecutorFactory;
  private readonly sessionEventClients = new Set<express.Response>();
  private readonly logFile = process.env["BACKEND_LOG_FILE"] ?? "backend.log";
  private readonly sessionEventStats = {
    eventsAppended: new Map<SessionId, number>(),
    assistantChunkEmits: new Map<SessionId, number>(),
  };
  private resetInFlight: Promise<void> | null = null;

  constructor(private readonly options?: BackendAppOptions) {
    initializeAuthState();
    this.port = options?.port ?? Number(process.env["BACKEND_PORT"] ?? "4123");
    this.sessionStore = new SessionStore({
      persistDir: options?.sessionStoreDir ?? getSessionsRoot(),
    });
    this.sessionStore.subscribe((event) => {
      this.recordSessionEvent(event);
      this.broadcastSessionEvent(event);
    });
    this.toolExecutorFactory = createToolExecutorFactory({
      mode: "cli",
      enqueueAction: (cliId, payload) => this.enqueueAction(cliId, payload),
      toolResultBroker: this.toolResultBroker,
    });
    const runtimeFactory = this.createRuntimeFactory();
    this.sessionRunner = new SessionRunnerService(this.sessionStore, runtimeFactory);
    this.log("BackendApp initialized", { port: this.port });
  }

  start(): void {
    if (this.app) {
      throw new Error("BackendApp already started");
    }
    this.app = express();
    this.app.use(cors());
    this.app.use(express.json());
    this.registerRoutes(this.app);
    this.server = this.app.listen(this.port, () => {
      console.log(`[backend] listening on http://localhost:${this.port}`);
    });
  }

  stop(): void {
    this.sessionEventClients.forEach((client) => client.end());
    this.sessionEventClients.clear();
    this.server?.close();
    this.server = null;
    this.app = null;
  }

  private createRuntimeFactory(): SessionRuntimeFactory {
    const authPath = this.resolveAuthPath();
    if (!this.hasAgentCredentials(authPath)) {
      throw new Error(
        `missing_agent_credentials: provide OPENAI_API_KEY/AZURE_OPENAI_API_KEY or ${authPath}`,
      );
    }
    return createAgentLoopRuntimeFactory({
      getSessionSummary: (sessionId: SessionId) =>
        this.sessionStore.get(sessionId)?.getSummary(),
      createToolExecutor: (summary: SessionSummary) =>
        this.toolExecutorFactory(summary),
      onAgentItem: (sessionId: SessionId, item: unknown) =>
        this.handleAgentStreamItem(sessionId, item),
    });
  }

  private resolveAuthPath(): string {
    return getAuthFilePath();
  }

  private hasAgentCredentials(authPath: string): boolean {
    return fs.existsSync(authPath);
  }

  private registerRoutes(app: Express): void {
    app.get("/api/health", (_req, res) => {
      res.json({
        ok: true,
        clis: this.clis.size,
        sessions: this.sessionStore.count(),
      });
    });

    app.get("/api/bootstrap", (_req, res) => {
      res.json(this.buildBootstrapState());
    });

    app.get("/api/session-events", (req, res) => {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();
      res.write("\n");
      this.sessionEventClients.add(res);
      const cleanup = () => {
        this.sessionEventClients.delete(res);
      };
      req.on("close", cleanup);
      req.on("end", cleanup);
    });

    app.get("/api/auth/status", (_req, res) => {
      this.log("GET /api/auth/status");
      const status = getAuthStatus();
      const pendingLogins = Array.from(this.pendingLoginClis).map((cliId) => ({
        cliId,
      }));
      res.json({ ...status, pendingLogins });
    });

    app.post("/api/auth/login", (req, res) => {
      this.log("POST /api/auth/login");
      const cliId = req.body?.cliId as CliId | undefined;
      if (!cliId) {
        res.status(400).json({ error: "missing_cli_id" });
        return;
      }
      if (!this.clis.has(cliId)) {
        res.status(404).json({ error: "cli_not_found" });
        return;
      }
      if (this.pendingLoginClis.has(cliId)) {
        res.status(409).json({ error: "login_pending" });
        return;
      }
      this.pendingLoginClis.add(cliId);
      this.enqueueAction(cliId, { type: "login_request" });
      this.log("Enqueued login_request action", { cliId });
      res.json({ ok: true });
    });

    app.post("/api/auth/logout", async (_req, res) => {
      this.log("POST /api/auth/logout");
      try {
        await logoutAuthState();
        this.pendingLoginClis.clear();
        res.json({ ok: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        res.status(500).json({ error: "logout_failed", message });
      }
    });

    app.post("/api/clis/:cliId/auth", async (req, res) => {
      const cliId = req.params["cliId"] as CliId;
      const summary = this.validateCliToken(cliId, req);
      if (!summary) {
        res.status(401).json({ error: "unauthorized" });
        return;
      }
      const authData = req.body?.authData;
      if (!authData || typeof authData !== "object") {
        res.status(400).json({ error: "invalid_auth_data" });
        return;
      }
      try {
        await persistAuthData(authData);
        this.pendingLoginClis.delete(cliId);
        this.log("Auth data uploaded by CLI", { cliId });
        res.json({ ok: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.log("Failed to persist auth data", { cliId, error: message });
        res.status(500).json({ error: "auth_persist_failed", message });
      }
    });

    app.post("/api/clis/:cliId/auth/cancel", (req, res) => {
      const cliId = req.params["cliId"] as CliId;
      const summary = this.validateCliToken(cliId, req);
      if (!summary) {
        res.status(401).json({ error: "unauthorized" });
        return;
      }
      this.pendingLoginClis.delete(cliId);
      this.log("Login flow canceled by CLI", { cliId });
      res.json({ ok: true });
    });

    app.get("/api/clis", (_req, res) => {
      res.json({
        clis: Array.from(this.clis.values()).map((cli) => this.stripCliToken(cli)),
      });
    });

    app
      .route("/api/sessions")
      .get((_req, res) => {
        res.json({ sessions: this.sessionStore.listSummaries() });
      })
      .post((req, res) => {
        const cliId: CliId | undefined = req.body?.cliId;
        const workdir: string = req.body?.workdir ?? process.cwd();
        const model: string = req.body?.model ?? "gpt-5.1-codex";
        const title: string | undefined = req.body?.title;
        if (!cliId) {
          res.status(400).json({ error: "missing_cli_id" });
          return;
        }
        if (!this.clis.has(cliId)) {
          res.status(404).json({ error: "cli_not_registered" });
          return;
        }
        const sessionId: SessionId = `sess_${randomUUID()}`;
        const summary: SessionSummary = {
          id: sessionId,
          cliId,
          model,
          workdir,
          status: "waiting",
          lastUpdated: new Date().toISOString(),
          title,
        };
        this.sessionStore.createSession(summary);
        this.log("Session created", { sessionId, cliId, workdir, model });
        const cli = this.clis.get(cliId);
        if (cli) {
          cli.sessionCount = this.countSessionsForCli(cliId);
          cli.lastSeen = new Date().toISOString();
        }
        res.status(201).json({ sessionId });
      });

    app.get("/api/sessions/:sessionId/timeline", (req, res) => {
      const sessionId = req.params["sessionId"] as SessionId;
      if (!this.sessionStore.get(sessionId)) {
        res.status(404).json({ error: "session_not_found" });
        return;
      }
      res.json({ timeline: this.sessionStore.getTimeline(sessionId) });
    });

    app.post("/api/sessions/:sessionId/timeline", async (req, res) => {
      const sessionId = req.params["sessionId"] as SessionId;
      const sessionExists = this.sessionStore.get(sessionId);
      if (!sessionExists) {
        res.status(404).json({ error: "session_not_found" });
        return;
      }
      const content = (req.body?.content ?? "").trim();
      if (!content) {
        res.status(400).json({ error: "missing_content" });
        return;
      }
      try {
        const result = await this.sessionRunner.submitPrompt(sessionId, content);
        const timeline = this.sessionStore.getTimeline(sessionId);
        res.json({ reply: result.reply, timeline });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.sessionStore.updateSummary(sessionId, { status: "error" });
        res.status(500).json({ error: "prompt_failed", message });
      }
    });

    app.post("/api/debug/reset", async (_req, res) => {
      await this.resetBackendState();
      res.json({ status: "ok" });
    });

    app.get("/api/debug/session-event-stats", (_req, res) => {
      res.json(this.getSessionEventStats());
    });

    app.post("/api/debug/sessions/:sessionId/events", (req, res) => {
      const sessionId = req.params["sessionId"] as SessionId;
      const events = req.body?.events;
      if (!Array.isArray(events) || events.length === 0) {
        res.status(400).json({ error: "missing_events" });
        return;
      }
      try {
        const appended = this.sessionStore.appendTimelineEvents(
          sessionId,
          events as Array<SessionEventDraft>,
        );
        res.json({ events: appended });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("not found")) {
          res.status(404).json({ error: "session_not_found" });
        } else {
          res
            .status(500)
            .json({ error: "append_failed", message });
        }
      }
    });

    app.get("/api/actions", (_req, res) => {
      res.json({ actions: this.actionQueue });
    });

    app.post("/api/clis/register", (req, res) => {
      const cliId: CliId = req.body?.cliId || `cli_${Date.now()}`;
      const label: string = req.body?.label || "Unnamed CLI";
      const token = req.body?.token || randomUUID();
      const entry: CliRecord = {
        id: cliId,
        label,
        status: "connected",
        lastSeen: new Date().toISOString(),
        sessionCount: this.countSessionsForCli(cliId),
        token,
      };
      this.clis.set(cliId, entry);
      res.json({ cliId, token, status: "ok" });
    });

    app.post("/api/clis/:cliId/heartbeat", (req, res) => {
      const cliId = req.params["cliId"] as CliId;
      const token = req.header("x-cli-token") || "";
      const summary = this.clis.get(cliId);
      if (summary && summary.token === token) {
        summary.lastSeen = new Date().toISOString();
        summary.status = "connected";
        res.json({ ok: true });
        return;
      }
      res.status(401).json({ error: "unauthorized" });
    });

    app.post("/api/clis/pairing", (_req, res) => {
      const cliId: CliId = `cli_${randomUUID()}`;
      const token = randomUUID();
      const entry: CliRecord = {
        id: cliId,
        label: "Pending CLI",
        status: "disconnected",
        lastSeen: new Date().toISOString(),
        sessionCount: 0,
        token,
      };
      this.clis.set(cliId, entry);
      res.json({ cliId, token });
    });

    app.post("/api/clis/:cliId/actions", (req, res) => {
      const cliId = req.params["cliId"] as CliId;
      if (!this.clis.has(cliId)) {
        res.status(404).json({ error: "cli_not_found" });
        return;
      }
      const actionId = `act_${randomUUID()}`;
      const sessionId: SessionId | undefined = req.body?.sessionId;
      this.enqueueAction(cliId, { ...req.body, sessionId }, actionId);
      res.status(201).json({ actionId });
    });

    app.get("/api/clis/:cliId/actions", (req, res) => {
      const cliId = req.params["cliId"] as CliId;
      const summary = this.validateCliToken(cliId, req);
      if (!summary) {
        res.status(401).json({ error: "unauthorized" });
        return;
      }
      const actions = this.actionQueue.filter(
        (action) => action.cliId === cliId && !action.delivered,
      );
      actions.forEach((action) => {
        action.delivered = true;
        if (action.sessionId) {
          this.sessionStore.updateSummary(action.sessionId, {
            status: "running",
          });
        }
      });
      if (actions.length > 0) {
        this.log("Delivering actions to CLI", { cliId, count: actions.length });
      }
      res.json({ actions });
    });

    app.post("/api/clis/:cliId/actions/:actionId/ack", (req, res) => {
      const cliId = req.params["cliId"] as CliId;
      const summary = this.validateCliToken(cliId, req);
      if (!summary) {
        res.status(401).json({ error: "unauthorized" });
        return;
      }
      const actionId = req.params["actionId"];
      const actionIndex = this.actionQueue.findIndex(
        (action) => action.cliId === cliId && action.actionId === actionId,
      );
      if (actionIndex >= 0) {
        const action = this.actionQueue[actionIndex];
        this.actionQueue.splice(actionIndex, 1);
        this.log("Action acknowledged", {
          cliId,
          actionId,
          type: (action.payload as { type?: string })?.type ?? "unknown",
        });
        if (action.sessionId) {
          this.sessionStore.updateSummary(action.sessionId, {
            status: "waiting",
          });
        }
        res.json({ ok: true });
        return;
      }
      res.status(404).json({ error: "action_not_found" });
    });

    app.post("/api/clis/:cliId/tool-results", (req, res) => {
      const cliId = req.params["cliId"] as CliId;
      const summary = this.validateCliToken(cliId, req);
      if (!summary) {
        res.status(401).json({ error: "unauthorized" });
        return;
      }
      const sessionId = req.body?.sessionId as SessionId | undefined;
      const callId = req.body?.callId as string | undefined;
      const outputs = req.body?.outputs;
      if (!sessionId || !callId || !Array.isArray(outputs)) {
        res.status(400).json({ error: "invalid_tool_result" });
        return;
      }
      const resolved = this.toolResultBroker.resolve(callId, outputs);
      if (!resolved) {
        res.status(404).json({ error: "call_not_found" });
        return;
      }
      res.json({ ok: true });
    });
  }

  private async resetBackendState(): Promise<void> {
    if (this.resetInFlight) {
      await this.resetInFlight;
      return;
    }
    this.resetInFlight = (async () => {
      this.log("Resetting backend state");
      await this.sessionRunner.resetAll();
      this.actionQueue.length = 0;
      this.toolResultBroker.reset(new Error("backend_reset"));
      this.sessionStore.reset();
      this.sessionEventStats.eventsAppended.clear();
      this.sessionEventStats.assistantChunkEmits.clear();
    })();
    try {
      await this.resetInFlight;
    } finally {
      this.resetInFlight = null;
    }
  }

  private stripCliToken(cli: CliRecord): CliSummary {
    const { token: _token, ...summary } = cli;
    return summary;
  }

  private buildBootstrapState(): BootstrapState {
    return {
      clis: Array.from(this.clis.values()).map((cli) => this.stripCliToken(cli)),
      sessions: this.sessionStore.listSummaries(),
      actions: this.actionQueue.map(({ actionId, cliId, sessionId, payload }) => ({
        actionId,
        cliId,
        sessionId,
        payload,
      })),
      timeline: this.sessionStore.toTimelineRecord(),
    };
  }

  private enqueueAction(
    cliId: CliId,
    payload: unknown,
    actionId: string = `act_${randomUUID()}`,
  ): void {
    const sessionId = (payload as { sessionId?: SessionId })?.sessionId;
    let workdir: string | undefined = (payload as { workdir?: string })?.workdir;
    if (!workdir && sessionId) {
      workdir = this.sessionStore.get(sessionId)?.getSummary().workdir;
    }
    const normalizedPayload =
      payload && typeof payload === "object"
        ? {
            ...(payload as Record<string, unknown>),
            workdir,
          }
        : {
            workdir,
          };
    this.actionQueue.push({
      actionId,
      cliId,
      sessionId,
      payload: normalizedPayload,
      delivered: false,
    });
    this.log("Action queued", {
      cliId,
      actionId,
      type: (normalizedPayload as { type?: string })?.type ?? "unknown",
      workdir: (normalizedPayload as { workdir?: string })?.workdir,
    });
  }

  private broadcastSessionEvent(event: SessionStoreEvent): void {
    const payload:
      | {
          type: "session_events_appended";
          sessionId: SessionId;
          events: Array<SessionEvent>;
        }
      | {
          type: "session_events_appended";
          sessionId: SessionId;
          events: Array<SessionEvent>;
          summary: SessionSummary;
        } =
      event.type === "session_summary_updated"
        ? {
            type: "session_events_appended",
            sessionId: event.sessionId,
            events: [],
            summary: event.summary,
          }
        : {
            type: "session_events_appended",
            sessionId: event.sessionId,
            events: event.events,
          };
    const data = `data: ${JSON.stringify(payload)}\n\n`;
    for (const client of this.sessionEventClients) {
      client.write(data);
    }
  }

  private recordSessionEvent(event: SessionStoreEvent): void {
    if (event.type === "session_events_appended") {
      const prev = this.sessionEventStats.eventsAppended.get(event.sessionId) ?? 0;
      this.sessionEventStats.eventsAppended.set(
        event.sessionId,
        prev + event.events.length,
      );
    }
  }

  private getSessionEventStats(): {
    eventsAppended: Record<SessionId, number>;
    assistantChunkEmits: Record<SessionId, number>;
  } {
    return {
      eventsAppended: Object.fromEntries(this.sessionEventStats.eventsAppended),
      assistantChunkEmits: Object.fromEntries(this.sessionEventStats.assistantChunkEmits),
    };
  }

  private recordAssistantChunk(sessionId: SessionId): void {
    const prev = this.sessionEventStats.assistantChunkEmits.get(sessionId) ?? 0;
    this.sessionEventStats.assistantChunkEmits.set(sessionId, prev + 1);
  }

  private handleAgentStreamItem(sessionId: SessionId, item: unknown): void {
    if (!item || typeof item !== "object") {
      return;
    }
    const payload = item as Record<string, unknown>;
    if (payload["agentEvent"] === true) {
      const timelineEvent = this.convertAgentEvent(payload);
      if (timelineEvent) {
        console.log("[backend] timeline event", timelineEvent);
        this.sessionStore.appendTimelineEvents(sessionId, [timelineEvent]);
      }
      return;
    }
    if (payload["type"] === "message") {
      const role = typeof payload["role"] === "string" ? payload["role"] : "system";
      if (role === "assistant") {
        const assistant = normalizeAssistantItem(item);
        if (!assistant) {
          return;
        }
        this.recordAssistantChunk(sessionId);
        this.sessionStore.upsertAssistantMessage(sessionId, assistant.id, assistant.text);
        return;
      }
      const execOutput = this.convertExecOutputEvent(payload);
      if (execOutput) {
        this.sessionStore.appendTimelineEvents(sessionId, [execOutput]);
        return;
      }
      const messageEvent = this.convertMessageEvent(payload, role);
      if (messageEvent) {
        this.sessionStore.appendTimelineEvents(sessionId, [messageEvent]);
      }
    }
  }

  private convertAgentEvent(event: Record<string, unknown>): SessionEventDraft | null {
    const type = typeof event["type"] === "string" ? event["type"] : "";
    const id = typeof event["id"] === "string" ? event["id"] : `agent-${type}-${Date.now()}`;
    switch (type) {
      case "plan_update": {
        const payload = event["payload"] as
          | {
              explanation?: string;
              plan?: Array<{ id?: string; step?: string; status?: string }>;
            }
          | undefined;
        if (!payload?.plan) {
          return null;
        }
        return {
          type: "plan_update",
          id,
          explanation:
            typeof payload.explanation === "string" ? payload.explanation : undefined,
          plan: payload.plan
            .filter(
              (item) =>
                item &&
                typeof item.step === "string" &&
                typeof item.status === "string",
            )
            .map((item) => ({
              id: item.id,
              step: item.step!,
              status: item.status! as
                | "pending"
                | "in_progress"
                | "completed"
                | "blocked",
            })),
        } as SessionEventDraft;
      }
      case "tool_call_started": {
        return {
          type: "tool_call_started",
          id,
          callId: typeof event["callId"] === "string" ? event["callId"] : `call_${Date.now()}`,
          toolName: typeof event["toolName"] === "string" ? event["toolName"] : "unknown",
        } as SessionEventDraft;
      }
      case "tool_call_output": {
        return {
          type: "tool_call_output",
          id,
          callId: typeof event["callId"] === "string" ? event["callId"] : `call_${Date.now()}`,
          toolName: typeof event["toolName"] === "string" ? event["toolName"] : "unknown",
          status: event["status"] === "error" ? "error" : "ok",
          durationSeconds:
            typeof event["durationSeconds"] === "number"
              ? event["durationSeconds"]
              : undefined,
          outputCount:
            typeof event["outputCount"] === "number" ? event["outputCount"] : undefined,
          error: typeof event["error"] === "string" ? event["error"] : undefined,
        } as SessionEventDraft;
      }
      case "exec_event": {
        const command = Array.isArray(event["command"])
          ? (event["command"] as Array<unknown>).map((entry) =>
              typeof entry === "string" ? entry : "",
            )
          : [];
        return {
          type: "exec_event",
          id,
          phase: event["phase"] === "end" ? "end" : "begin",
          callId: typeof event["callId"] === "string" ? event["callId"] : undefined,
          command: command.filter((entry) => entry.length > 0),
          cwd: typeof event["cwd"] === "string" ? event["cwd"] : undefined,
          exitCode:
            typeof event["exitCode"] === "number" ? event["exitCode"] : undefined,
          durationSeconds:
            typeof event["durationSeconds"] === "number"
              ? event["durationSeconds"]
              : undefined,
        } as SessionEventDraft;
      }
      case "reasoning_summary_delta":
        return {
          type: "reasoning_summary_delta",
          id,
          summaryIndex:
            typeof event["summaryIndex"] === "number" ? event["summaryIndex"] : 0,
          delta: typeof event["delta"] === "string" ? event["delta"] : "",
        } as SessionEventDraft;
      case "reasoning_content_delta":
        return {
          type: "reasoning_content_delta",
          id,
          contentIndex:
            typeof event["contentIndex"] === "number" ? event["contentIndex"] : 0,
          delta: typeof event["delta"] === "string" ? event["delta"] : "",
        } as SessionEventDraft;
      case "reasoning_section_break":
        return {
          type: "reasoning_section_break",
          id,
          summaryIndex:
            typeof event["summaryIndex"] === "number" ? event["summaryIndex"] : 0,
        } as SessionEventDraft;
      default:
        return null;
    }
  }

  private convertExecOutputEvent(
    item: Record<string, unknown>,
  ): SessionEventDraft | null {
    const metadata = item["metadata"] as { [key: string]: unknown } | undefined;
    if (!metadata || metadata["source"] !== "exec") {
      return null;
    }
    const text = extractText(item["content"]);
    if (!text) {
      return null;
    }
    return {
      type: "exec_output",
      id: typeof item["id"] === "string" ? item["id"] : `exec-output-${Date.now()}`,
      callId: typeof metadata["call_id"] === "string" ? metadata["call_id"] : undefined,
      stream:
        metadata["stream"] === "stderr"
          ? "stderr"
          : metadata["stream"] === "combined"
            ? "combined"
            : "stdout",
      text,
    } as SessionEventDraft;
  }

  private convertMessageEvent(
    item: Record<string, unknown>,
    role: string,
  ): SessionEventDraft | null {
    const text = extractText(item["content"]);
    if (!text) {
      return null;
    }
    const segments = [
      {
        type: "text" as const,
        text,
      },
    ];
    return {
      type: "message",
      id: typeof item["id"] === "string" ? item["id"] : `evt_${Date.now()}`,
      role: role as "system" | "tool" | "user",
      content: segments,
    } as SessionEventDraft;
  }

  private countSessionsForCli(cliId: CliId): number {
    return this.sessionStore.listSummaries().filter((s) => s.cliId === cliId).length;
  }

  private validateCliToken(
    cliId: CliId,
    req: express.Request,
  ): CliRecord | null {
    const token = req.header("x-cli-token") || "";
    const summary = this.clis.get(cliId);
    if (!summary || summary.token !== token) {
      return null;
    }
    return summary;
  }

  private log(message: string, extra?: unknown): void {
    logToFile(this.logFile, "[backend]", message, extra);
  }
}

export function createBackendApp(options?: BackendAppOptions): BackendApp {
  return new BackendApp(options);
}

type AssistantItemPayload = {
  id: string;
  text: string;
};

function normalizeAssistantItem(input: unknown): AssistantItemPayload | null {
  if (!input || typeof input !== "object") {
    return null;
  }
  const item = input as { id?: unknown; type?: unknown; role?: unknown; content?: unknown };
  if (item.type !== "message" || item.role !== "assistant") {
    return null;
  }
  if (typeof item.id !== "string") {
    return null;
  }
  const text = extractText(item.content);
  if (!text) {
    return null;
  }
  return { id: item.id, text };
}

function extractText(content: unknown): string | null {
  if (!Array.isArray(content)) {
    return null;
  }
  const combined = content
    .map((segment) => {
      if (segment && typeof segment === "object" && "text" in segment) {
        const value = (segment as { text?: unknown }).text;
        return typeof value === "string" ? value : "";
      }
      return "";
    })
    .join("");
  const trimmed = combined.trim();
  return trimmed.length > 0 ? trimmed : null;
}
