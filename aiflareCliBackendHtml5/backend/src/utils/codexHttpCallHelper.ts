import { randomUUID } from "node:crypto";
import OpenAI from "openai";

import { BackendCredentials } from "../backend/backend-credentials.js";
import { CLI_VERSION } from "../version.js";
import { InstructionsManager } from "./instructionsManager.js";
import { ORIGIN } from "./session.js";
import { httpManager } from "./http-manager.js";

type CodexResponseContent = {
  type?: string;
  text?: string;
};

type CodexResponseMessage = {
  type?: string;
  role?: string;
  content?: Array<CodexResponseContent>;
};

interface CodexResponseShape {
  output?: Array<CodexResponseMessage>;
}

interface CodexCallOptions {
  model?: string;
}

export class CodexHttpCallHelper {
  static async callCodex(
    prompt: string,
    options?: CodexCallOptions,
  ): Promise<string> {
    const creds = BackendCredentials.ensure();
    const instructions = InstructionsManager.getDefaultInstructions();
    const model = options?.model ?? "gpt-5.1-codex";

    const client = this.createClient(
      creds.accessToken,
      creds.codexBaseUrl,
      creds.chatgptAccountId,
    );
    const stream = await client.responses.create(
      this.buildRequest(prompt, model, instructions),
    );
    const reply = await this.consumeStream(
      stream as unknown as AsyncIterable<ResponseStreamEvent>,
    );
    if (!reply) {
      throw new Error("empty_agent_response");
    }
    return reply;
  }

  private static createClient(
    apiKey: string,
    baseURL: string,
    chatgptAccountId?: string,
  ): OpenAI {
    return new OpenAI({
      apiKey,
      baseURL,
      defaultHeaders: {
        originator: ORIGIN,
        version: CLI_VERSION,
        session_id: randomUUID(),
        ...(chatgptAccountId
          ? { "chatgpt-account-id": chatgptAccountId }
          : {}),
      },
      fetch: httpManager.fetch.bind(httpManager),
    });
  }

  private static buildRequest(
    prompt: string,
    model: string,
    instructions: string,
  ): CodexResponseCreateParams {
    return {
      model,
      instructions,
      input: [
        {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text: prompt,
            },
          ],
        },
      ],
      tools: [],
      parallel_tool_calls: false,
      tool_choice: "auto",
      stream: true,
      store: false,
    };
  }

  private static async consumeStream(
    stream: AsyncIterable<ResponseStreamEvent>,
  ): Promise<string> {
    let buffer = "";
    for await (const event of stream) {
      if (event.type === "response.output_text.delta") {
        buffer += event.delta ?? "";
      }
    }
    return buffer.trim();
  }
}

type CodexResponseCreateParams =
  Parameters<OpenAI["responses"]["create"]>[0];

type ResponseStreamEvent = {
  type?: string;
  delta?: string;
};
