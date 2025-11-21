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
      timeline: {},
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

  it("creates session, handles messages and exposes timeline", async () => {
    const createRes = await request(serverUrl)
      .post("/api/sessions")
      .send({ cliId: "cli_test", workdir: "/tmp", model: "gpt-5.1-codex" });
    expect(createRes.status).toBe(201);
    const { sessionId } = createRes.body;

    const sessionsRes = await request(serverUrl).get("/api/sessions");
    expect(sessionsRes.body.sessions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: sessionId, cliId: "cli_test", status: "waiting" }),
      ]),
    );

    const messageRes = await request(serverUrl)
      .post(`/api/sessions/${sessionId}/timeline`)
      .send({ content: "hi ai antworte mir bitte mit hallo" });
    if (messageRes.status !== 200) {
      // eslint-disable-next-line no-console
      console.error("timeline request failed", messageRes.body);
    }
    expect(messageRes.status).toBe(200);
    expect(messageRes.body.reply?.toLowerCase()).toContain("hallo");
    expect(Array.isArray(messageRes.body.timeline)).toBe(true);
    const roles = messageRes.body.timeline
      .filter((event: { type: string }) => event.type === "message")
      .map((event: { role: string }) => event.role);
    expect(roles).toEqual(expect.arrayContaining(["user", "assistant"]));

    const timelineRes = await request(serverUrl).get(`/api/sessions/${sessionId}/timeline`);
    expect(Array.isArray(timelineRes.body.timeline)).toBe(true);

    const bootstrapAfter = await request(serverUrl).get("/api/bootstrap");
    expect(bootstrapAfter.body.sessions).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: sessionId })]),
    );
    expect(
      (bootstrapAfter.body.timeline[sessionId] ?? []).some(
        (event: { type: string; role?: string }) =>
          event.type === "message" && event.role === "assistant",
      ),
    ).toBe(true);
  });
});
