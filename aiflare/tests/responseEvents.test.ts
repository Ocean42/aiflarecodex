import { describe, it, expect } from "vitest";

import { mapWireEventToCore } from "../src/backend/responseEvents.js";
import type { ResponseOutput } from "../src/utils/responses.js";

describe("mapWireEventToCore", () => {
  it("maps response.created to created", () => {
    const core = mapWireEventToCore({
      type: "response.created",
      response: {} as Partial<ResponseOutput>,
    });
    expect(core).toEqual({ type: "created" });
  });

  it("maps output_item.added to output_item_added", () => {
    const item = { type: "message", id: "msg-1" };
    const core = mapWireEventToCore({
      type: "response.output_item.added",
      output_index: 0,
      item,
    });
    expect(core).toEqual({ type: "output_item_added", item });
  });

  it("maps response.completed with usage to completed + tokenUsage", () => {
    const response: ResponseOutput = {
      id: "resp-1",
      object: "response",
      created_at: 0,
      status: "completed",
      error: null,
      incomplete_details: null,
      instructions: null,
      max_output_tokens: null,
      model: "gpt-test",
      output: [] as any,
      parallel_tool_calls: false,
      previous_response_id: null,
      reasoning: null as any,
      temperature: null as any,
      text: { format: { type: "text" } },
      tool_choice: "auto",
      tools: [],
      top_p: null as any,
      truncation: "disabled" as any,
      usage: {
        input_tokens: 10,
        input_tokens_details: { cached_tokens: 0 },
        output_tokens: 5,
        output_tokens_details: { reasoning_tokens: 0 },
        total_tokens: 15,
      },
      user: null,
      metadata: {},
      output_text: "",
    };

    const core = mapWireEventToCore({
      type: "response.completed",
      response,
    });

    expect(core).toEqual({
      type: "completed",
      responseId: "resp-1",
      tokenUsage: {
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
      },
    });
  });
});

