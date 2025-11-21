import express, { type Express } from "express";
import cors from "cors";
import type { Server } from "node:http";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import type {
  BootstrapState,
  CliId,
  CliSummary,
  SessionId,
  SessionMessage,
  SessionSummary,
} from "@aiflare/protocol";
import {
  getAuthStatus,
  initializeAuthState,
  logoutAuthState,
} from "./services/authState.js";
import { logToFile } from "./services/logWriter.js";
import { persistAuthData } from "./services/authStorage.js";
import { SessionStore, type SessionStoreEvent } from "./services/sessionStore.js";
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
    messagesAppended: new Map<SessionId, number>(),
    assistantChunkEmits: new Map<SessionId, number>(),
  };

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
        this.sessionStore.appendEvent(sessionId, "created", { cliId, workdir, model });
        const cli = this.clis.get(cliId);
        if (cli) {
          cli.sessionCount = this.countSessionsForCli(cliId);
          cli.lastSeen = new Date().toISOString();
        }
        res.status(201).json({ sessionId });
      });

    app.get("/api/sessions/:sessionId/messages", (req, res) => {
      const sessionId = req.params["sessionId"] as SessionId;
      if (!this.sessionStore.get(sessionId)) {
        res.status(404).json({ error: "session_not_found" });
        return;
      }
      res.json({ messages: this.sessionStore.getMessages(sessionId) });
    });

    app.post("/api/sessions/:sessionId/messages", async (req, res) => {
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
        const messages = this.sessionStore.getMessages(sessionId);
        res.json({ reply: result.reply, messages });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.sessionStore.updateSummary(sessionId, { status: "error" });
        res.status(500).json({ error: "prompt_failed", message });
      }
    });

    app.get("/api/sessions/:sessionId/history", (req, res) => {
      const sessionId = req.params["sessionId"] as SessionId;
      if (!this.sessionStore.get(sessionId)) {
        res.status(404).json({ error: "session_not_found" });
        return;
      }
      res.json({ history: this.sessionStore.getEvents(sessionId) });
    });

    app.post("/api/debug/reset", (_req, res) => {
      this.sessionStore.reset();
      this.sessionEventStats.messagesAppended.clear();
      this.sessionEventStats.assistantChunkEmits.clear();
      res.json({ status: "ok" });
    });

    app.get("/api/debug/session-event-stats", (_req, res) => {
      res.json(this.getSessionEventStats());
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
          this.sessionStore.appendEvent(action.sessionId, "action_acknowledged", {
            actionId,
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
      this.sessionStore.appendEvent(sessionId, "tool_result_received", {
        callId,
      });
      res.json({ ok: true });
    });
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
      transcripts: this.sessionStore.toTranscriptRecord(),
    };
  }

  private enqueueAction(
    cliId: CliId,
    payload: unknown,
    actionId: string = `act_${randomUUID()}`,
  ): void {
    const sessionId = (payload as { sessionId?: SessionId })?.sessionId;
    this.actionQueue.push({
      actionId,
      cliId,
      sessionId,
      payload,
      delivered: false,
    });
    this.log("Action queued", {
      cliId,
      actionId,
      type: (payload as { type?: string })?.type ?? "unknown",
    });
    if (sessionId) {
      this.sessionStore.appendEvent(sessionId, "action_enqueued", {
        actionId,
        payload,
      });
    }
  }

  private broadcastSessionEvent(event: SessionStoreEvent): void {
    let payload:
      | {
          type: "session_summary_updated";
          sessionId: SessionId;
          summary: SessionSummary;
        }
      | {
          type: "session_messages_appended";
          sessionId: SessionId;
          messages: Array<SessionMessage>;
        }
      | {
          type: "session_message_updated";
          sessionId: SessionId;
          message: SessionMessage;
        };
    switch (event.type) {
      case "session_summary_updated":
        payload = {
          type: "session_summary_updated",
          sessionId: event.sessionId,
          summary: event.summary,
        };
        break;
      case "session_message_updated":
        payload = {
          type: "session_message_updated",
          sessionId: event.sessionId,
          message: event.message,
        };
        break;
      default:
        payload = {
          type: "session_messages_appended",
          sessionId: event.sessionId,
          messages: event.messages,
        };
        break;
    }
    const data = `data: ${JSON.stringify(payload)}\n\n`;
    for (const client of this.sessionEventClients) {
      client.write(data);
    }
  }

  private recordSessionEvent(event: SessionStoreEvent): void {
    if (event.type === "session_messages_appended") {
      const prev = this.sessionEventStats.messagesAppended.get(event.sessionId) ?? 0;
      this.sessionEventStats.messagesAppended.set(
        event.sessionId,
        prev + event.messages.length,
      );
    }
  }

  private getSessionEventStats(): {
    messagesAppended: Record<SessionId, number>;
    assistantChunkEmits: Record<SessionId, number>;
  } {
    return {
      messagesAppended: Object.fromEntries(this.sessionEventStats.messagesAppended),
      assistantChunkEmits: Object.fromEntries(this.sessionEventStats.assistantChunkEmits),
    };
  }

  private recordAssistantChunk(sessionId: SessionId): void {
    const prev = this.sessionEventStats.assistantChunkEmits.get(sessionId) ?? 0;
    this.sessionEventStats.assistantChunkEmits.set(sessionId, prev + 1);
  }

  private handleAgentStreamItem(sessionId: SessionId, item: unknown): void {
    const payload = normalizeAssistantItem(item);
    if (!payload) {
      return;
    }
    this.recordAssistantChunk(sessionId);
    this.sessionStore.upsertAssistantMessage(sessionId, payload.id, payload.text);
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
