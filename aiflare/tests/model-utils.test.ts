import { describe, it, expect } from "vitest";

import { uniqueById } from "../src/utils/model-utils.js";
import type { AgentResponseItem } from "../src/utils/agent/agent-events.js";

const makeReasoning = (delta: string): AgentResponseItem => ({
  agentEvent: true,
  type: "reasoning_summary_delta",
  id: "reasoning-summary-0",
  summaryIndex: 0,
  delta,
} as AgentResponseItem);

describe("uniqueById", () => {
  it("replaces agent events that share the same id", () => {
    const first = makeReasoning("Preparing");
    const second = makeReasoning("Preparing to inspect repository");
    const result = uniqueById([first, second]);
    expect(result).toHaveLength(1);
    expect(result[0]?.delta).toBe("Preparing to inspect repository");
  });
});
