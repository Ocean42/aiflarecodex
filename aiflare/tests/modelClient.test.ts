import { describe, it, expect } from "vitest";

import type { ResponseCreateParams } from "openai/resources/responses/responses.mjs";

import { createResponsesRequest } from "../src/backend/modelClient.js";

describe("createResponsesRequest", () => {
  const baseConfig = {
    model: "test-model",
    instructions: "test",
    input: [] as ResponseCreateParams["input"],
    tools: [],
    disableResponseStorage: false,
    previousResponseId: "",
    config: {
      model: "test-model",
      instructions: "test",
    } as any,
  };

  it("builds a streaming Responses request with storage enabled", () => {
    const params = createResponsesRequest({
      ...baseConfig,
      parallelToolCalls: false,
    });

    expect(params.model).toBe("test-model");
    expect(params.instructions).toBe("test");
    expect(params.stream).toBe(true);
    expect(params.parallel_tool_calls).toBe(false);
    expect(params.store).toBe(true);
    expect(params.previous_response_id).toBeUndefined();
    expect(params.tool_choice).toBe("auto");
  });

  it("disables storage when disableResponseStorage is true", () => {
    const params = createResponsesRequest({
      ...{
        ...baseConfig,
        parallelToolCalls: false,
      },
      disableResponseStorage: true,
    });

    expect(params.store).toBe(false);
    expect(params.previous_response_id).toBeUndefined();
  });

  it("sets previous_response_id when provided and storage is enabled", () => {
    const params = createResponsesRequest({
      ...{
        ...baseConfig,
        parallelToolCalls: false,
      },
      previousResponseId: "resp-123",
    });

    expect(params.store).toBe(true);
    expect(params.previous_response_id).toBe("resp-123");
  });
});
