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
    app = createBackendApp({
      port: 0,
      sessionStoreDir: sessionDir,
      forceLegacyAgent: true,
    });
    app.start();
    const addr = (app as unknown as { server: { address(): { port: number } } }).server.address();
    serverUrl = `http://localhost:${addr.port}`;
  });

  afterAll(() => {
    app.stop();
    rmSync(sessionDir, { recursive: true, force: true });
  });

  it("returns bootstrap info", async () => {
    const response = await request(serverUrl).get("/api/bootstrap");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      clis: [],
      sessions: [],
      transcripts: {},
    });
  });

  it("registers CLI and lists them", async () => {
    const registerRes = await request(serverUrl)
      .post("/api/clis/register")
      .send({ cliId: "cli_test", label: "Test CLI" });
    expect(registerRes.status).toBe(200);

    const listRes = await request(serverUrl).get("/api/clis");
    expect(listRes.status).toBe(200);
    expect(listRes.body.clis).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "cli_test", label: "Test CLI" }),
      ]),
    );
  });

  it("creates session, handles messages and exposes transcripts", async () => {
    const createRes = await request(serverUrl)
      .post("/api/sessions")
      .send({ cliId: "cli_test", workdir: "/tmp", model: "gpt-test" });
    expect(createRes.status).toBe(201);
    const { sessionId } = createRes.body;

    const sessionsRes = await request(serverUrl).get("/api/sessions");
    expect(sessionsRes.body.sessions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: sessionId, cliId: "cli_test", status: "waiting" }),
      ]),
    );

    const messageRes = await request(serverUrl)
      .post(`/api/sessions/${sessionId}/messages`)
      .send({ content: "hi ai antworte mir bitte mit hallo" });
    expect(messageRes.status).toBe(200);
    expect(messageRes.body.reply).toBe("Hallo");
    expect(messageRes.body.messages).toHaveLength(2);

    const messagesRes = await request(serverUrl).get(`/api/sessions/${sessionId}/messages`);
    expect(messagesRes.body.messages).toHaveLength(2);

    const historyRes = await request(serverUrl).get(`/api/sessions/${sessionId}/history`);
    expect(historyRes.body.history).toEqual(
      expect.arrayContaining([expect.objectContaining({ event: "created" })]),
    );

    const bootstrapAfter = await request(serverUrl).get("/api/bootstrap");
    expect(bootstrapAfter.body.sessions).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: sessionId })]),
    );
    expect(bootstrapAfter.body.transcripts[sessionId]).toHaveLength(2);
  });
});
