import express, { type Express } from "express";
import cors from "cors";
import type { Server } from "node:http";
import { randomUUID } from "node:crypto";
import type {
  CliId,
  CliSummary,
  SessionId,
  SessionSummary,
} from "@aiflare/protocol";

export interface BackendAppOptions {
  port?: number;
}

export class BackendApp {
  private readonly port: number;
  private app: Express | null = null;
  private server: Server | null = null;
  private clis = new Map<CliId, CliSummary & { token: string }>();
  private sessions = new Map<SessionId, SessionSummary>();
  private sessionHistory = new Map<SessionId, Array<{ timestamp: string; event: string; data?: unknown }>>();
  private actionQueue: Array<{
    actionId: string;
    cliId: CliId;
    sessionId?: SessionId;
    payload: unknown;
  }> = [];

  constructor(options?: BackendAppOptions) {
    this.port = options?.port ?? Number(process.env["BACKEND_PORT"] ?? "4123");
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
    this.server?.close();
    this.server = null;
    this.app = null;
  }

  private registerRoutes(app: Express): void {
    app.get("/api/health", (_req, res) => {
      res.json({
        ok: true,
        clis: this.clis.size,
        sessions: this.sessions.size,
      });
    });

    app.get("/api/clis", (_req, res) => {
      res.json({ clis: Array.from(this.clis.values()) });
    });

    app
      .route("/api/sessions")
      .get((_req, res) => {
        res.json({ sessions: Array.from(this.sessions.values()) });
      })
      .post((req, res) => {
        const cliId: CliId = req.body?.cliId;
        const workdir: string = req.body?.workdir ?? process.cwd();
        const model: string = req.body?.model ?? "gpt-4.1-mini";
        if (!cliId) {
          res.status(400).json({ error: "missing_cli_id" });
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
        };
        this.sessions.set(sessionId, summary);
        this.appendSessionEvent(sessionId, "created", { cliId, workdir, model });
        const cli = this.clis.get(cliId);
        if (cli) {
          cli.sessionCount = this.countSessionsForCli(cliId);
          cli.lastSeen = new Date().toISOString();
        }
        this.enqueueAction(cliId, {
          type: "noop",
          sessionId,
          workdir,
        });
        this.enqueueAction(cliId, {
          type: "run_command",
          sessionId,
          workdir,
          command: ["echo", "hello from backend"],
        });
        res.status(201).json({ sessionId });
      });

    app.get("/api/actions", (_req, res) => {
      res.json({ actions: this.actionQueue });
    });

    app.get("/api/sessions/:sessionId/history", (req, res) => {
      const sessionId = req.params["sessionId"] as SessionId;
      const history = this.sessionHistory.get(sessionId) ?? [];
      res.json({ history });
    });

    app.post("/api/clis/register", (req, res) => {
      const cliId: CliId = req.body?.cliId || `cli_${Date.now()}`;
      const label: string = req.body?.label || "Unnamed CLI";
      const token = req.body?.token || randomUUID();
      const entry: CliSummary & { token: string } = {
        id: cliId,
        label,
        status: "connected",
        lastSeen: new Date().toISOString(),
        sessionCount: 0,
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
      const entry: CliSummary & { token: string } = {
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
      const actions = this.actionQueue.filter((action) => action.cliId === cliId);
      actions.forEach((action) => {
        if (action.sessionId) {
          const session = this.sessions.get(action.sessionId);
          if (session) {
            session.status = "running";
            session.lastUpdated = new Date().toISOString();
          }
        }
      });
      res.json({ actions });
    });

    app.post("/api/clis/:cliId/actions/:actionId/ack", (req, res) => {
      const cliId = req.params["cliId"] as CliId;
      const actionId = req.params["actionId"];
      const actionIndex = this.actionQueue.findIndex(
        (action) => action.cliId === cliId && action.actionId === actionId,
      );
      if (actionIndex >= 0) {
        const action = this.actionQueue[actionIndex];
        this.actionQueue.splice(actionIndex, 1);
        if (action.sessionId) {
          const session = this.sessions.get(action.sessionId);
          if (session) {
            session.status = "waiting";
            session.lastUpdated = new Date().toISOString();
            this.appendSessionEvent(action.sessionId, "action_acknowledged", { actionId });
          }
        }
        res.json({ ok: true });
        return;
      }
      res.status(404).json({ error: "action_not_found" });
    });
  }

  private countSessionsForCli(cliId: CliId): number {
    let count = 0;
    for (const session of this.sessions.values()) {
      if (session.cliId === cliId) {
        count++;
      }
    }
    return count;
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
    });
    if (sessionId) {
      this.appendSessionEvent(sessionId, "action_enqueued", { actionId, payload });
    }
  }

  private appendSessionEvent(
    sessionId: SessionId,
    event: string,
    data?: unknown,
  ): void {
    const events = this.sessionHistory.get(sessionId) ?? [];
    events.push({ timestamp: new Date().toISOString(), event, data });
    this.sessionHistory.set(sessionId, events);
  }
}

export function createBackendApp(options?: BackendAppOptions): BackendApp {
  return new BackendApp(options);
}
