import { describe, it, expect } from "vitest";

import { ActionTracker } from "../src/utils/actionTracker.js";

describe("ActionTracker", () => {
  it("allows first begin and blocks duplicates", () => {
    const tracker = new ActionTracker();
    expect(tracker.begin("a")).toBe(true);
    expect(tracker.begin("a")).toBe(false);
    tracker.end("a");
    expect(tracker.begin("a")).toBe(true);
  });

  it("handles multiple action ids independently", () => {
    const tracker = new ActionTracker();
    expect(tracker.begin("one")).toBe(true);
    expect(tracker.begin("two")).toBe(true);
    expect(tracker.begin("one")).toBe(false);
    tracker.end("one");
    expect(tracker.begin("one")).toBe(true);
    tracker.end("two");
    expect(tracker.begin("two")).toBe(true);
  });
});
