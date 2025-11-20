import { describe, it, expect } from "vitest";
import { ToolResultBroker } from "../src/services/toolResultBroker.js";

describe("ToolResultBroker", () => {
  it("resolves pending result", async () => {
    const broker = new ToolResultBroker();
    const promise = broker.waitForResult("call1", 500);
    broker.resolve("call1", [
      { type: "function_call_output", call_id: "call1", output: "{}" },
    ]);
    const outputs = await promise;
    expect(outputs).toHaveLength(1);
    expect(outputs[0]).toMatchObject({ call_id: "call1" });
  });

  it("rejects on timeout", async () => {
    const broker = new ToolResultBroker();
    await expect(broker.waitForResult("call2", 10)).rejects.toThrow(
      /timed out/,
    );
  });
});
