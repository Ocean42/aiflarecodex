import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SessionSummary } from "@aiflare/protocol";
import { SessionStore } from "../src/services/sessionStore.js";

describe("SessionStore", () => {
  let persistDir: string;
  let summary: SessionSummary;

  beforeEach(() => {
    persistDir = mkdtempSync(join(tmpdir(), "session-store-test-"));
    summary = {
      id: `sess_test_${Math.random().toString(36).slice(2)}`,
      cliId: "cli_test",
      model: "gpt-test",
      workdir: "/tmp",
      status: "waiting",
      lastUpdated: new Date().toISOString(),
      title: "Test Session",
    };
  });

  it("appends messages, trims history and persists to disk", () => {
    const store = new SessionStore({ persistDir, maxEvents: 3 });
    store.createSession(summary);

    store.appendMessage(summary.id, "user", "hello");
    store.appendMessage(summary.id, "assistant", "world");
    store.appendMessage(summary.id, "user", "again");
    store.appendMessage(summary.id, "assistant", "trimmed");

    const timeline = store.getTimeline(summary.id).filter((event) => event.type === "message");
    expect(timeline).toHaveLength(3);
    expect(timeline.at(0)?.content[0]).toMatchObject({ text: "world" });

    const snapshot = JSON.parse(
      readFileSync(join(persistDir, `${summary.id}.json`), "utf-8"),
    );
    expect(snapshot.timeline).toHaveLength(3);
    expect(snapshot.summary.id).toBe(summary.id);

    rmSync(persistDir, { recursive: true, force: true });
  });

  it("loads persisted sessions on startup", () => {
    {
      const store = new SessionStore({ persistDir });
      store.createSession(summary);
      store.appendMessage(summary.id, "user", "persist me");
    }

    const restored = new SessionStore({ persistDir });
    const restoredTimeline = restored.getTimeline(summary.id);
    const restoredMessages = restoredTimeline.filter((event) => event.type === "message");
    expect(restored.count()).toBe(1);
    expect(restoredMessages).toHaveLength(1);
    expect(restoredMessages[0]?.content[0]).toMatchObject({ text: "persist me" });

    rmSync(persistDir, { recursive: true, force: true });
  });

  it("emits events on message append and summary updates", () => {
    const store = new SessionStore({ persistDir });
    store.createSession(summary);
    const received: Array<{ type: string }> = [];
    const unsubscribe = store.subscribe((event) => {
      received.push(event);
    });

    store.appendMessage(summary.id, "user", "hi there");
    store.updateSummary(summary.id, { status: "running" });
    unsubscribe();

    expect(received).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "session_events_appended" }),
        expect.objectContaining({
          type: "session_summary_updated",
          summary: expect.objectContaining({ status: "running" }),
        }),
      ]),
    );
    rmSync(persistDir, { recursive: true, force: true });
  });
});
