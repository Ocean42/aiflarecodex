import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { createBackendApp, BackendApp } from "../src/backendApp.js";

describe("BackendApp routes", () => {
  let app: BackendApp;
  let serverUrl: string;
  let sessionDir: string;

  beforeAll(async () => {
    sessionDir = mkdtempSync(join(tmpdir(), "backend-app-test-"));
    app = createBackendApp({ port: 0, sessionStoreDir: sessionDir });
    app.start();
    const addr = (app as unknown as { server: { address(): { port: number } } }).server.address();
    serverUrl = `http://localhost:${addr.port}`;
  });

  afterAll(() => {
    app.stop();
    rmSync(sessionDir, { recursive: true, force: true });
  });

  it("returns health info", async () => {
    const response = await request(serverUrl).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ ok: true, clis: 0, sessions: 0 });
  });

  it("registers CLI and lists them", async () => {
    const label = "test-cli";
    const registerRes = await request(serverUrl)
      .post("/api/clis/register")
      .send({ cliId: "cli_test", label });
    expect(registerRes.status).toBe(200);

    const listRes = await request(serverUrl).get("/api/clis");
    expect(listRes.body.clis).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "cli_test", label, status: "connected" }),
      ]),
    );
  });

  it("creates session and enqueues actions", async () => {
    await request(serverUrl).post("/api/clis/register").send({ cliId: "cli_session" });
    const createRes = await request(serverUrl)
      .post("/api/sessions")
      .send({ cliId: "cli_session", workdir: "/tmp", model: "gpt-test" });
    expect(createRes.status).toBe(201);
    const { sessionId } = createRes.body;

    const sessionsRes = await request(serverUrl).get("/api/sessions");
    expect(sessionsRes.body.sessions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: sessionId, cliId: "cli_session", status: "waiting" }),
      ]),
    );

    const actionsRes = await request(serverUrl).get("/api/actions");
    expect(actionsRes.body.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sessionId, payload: expect.objectContaining({ type: "run_command" }) }),
        expect.objectContaining({ sessionId, payload: expect.objectContaining({ type: "noop" }) }),
      ]),
    );
  });

  it("returns session history", async () => {
    await request(serverUrl).post("/api/clis/register").send({ cliId: "cli_hist" });
    const createRes = await request(serverUrl)
      .post("/api/sessions")
      .send({ cliId: "cli_hist" });
    const { sessionId } = createRes.body;

    const historyRes = await request(serverUrl).get(`/api/sessions/${sessionId}/history`);
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.history.length).toBeGreaterThan(0);
    expect(historyRes.body.history[0]).toMatchObject({ event: "created" });
  });
});
