import type { Tool as OpenAITool } from "openai/resources/responses/responses.mjs";
import type {
  CallToolResult,
  ListResourceTemplatesResult,
  ListResourcesResult,
  Resource,
  ResourceTemplate,
  ReadResourceResult,
  Tool as McpTool,
} from "@modelcontextprotocol/sdk/types.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { createHash } from "node:crypto";

import type { McpServerDefinition } from "./config.js";
import { CLI_VERSION } from "../../version.js";
import { log } from "../logger/log.js";

const MCP_TOOL_NAME_DELIMITER = "__";
const MAX_TOOL_NAME_LENGTH = 64;

export type ListResourcesPayload = {
  server?: string;
  resources: Array<ResourceWithServer>;
  nextCursor?: string;
};

export type ListResourceTemplatesPayload = {
  server?: string;
  resourceTemplates: Array<ResourceTemplateWithServer>;
  nextCursor?: string;
};

export type ReadResourcePayload = {
  server: string;
  uri: string;
  result: ReadResourceResult;
};

export type McpToolInvocationResult = {
  server: string;
  tool: string;
  content: CallToolResult["content"];
  structuredContent?: unknown;
  isError?: boolean;
};

export type McpToolDescriptor = {
  qualifiedName: string;
  serverName: string;
  toolName: string;
  functionTool: OpenAITool;
};

type ManagedClient = {
  config: McpServerDefinition;
  client: Client;
  transport: Transport;
  tools: Map<string, McpTool>;
};

type ResourceWithServer = {
  server: string;
  resource: Resource;
};

type ResourceTemplateWithServer = {
  server: string;
  template: ResourceTemplate;
};

export class McpConnectionManager {
  private readonly servers: Record<string, McpServerDefinition>;
  private readonly descriptors: Array<McpToolDescriptor> = [];
  private readonly clients = new Map<string, ManagedClient>();
  private initPromise: Promise<void> | null = null;

  constructor(options: { servers: Record<string, McpServerDefinition> }) {
    this.servers = options.servers;
    if (Object.keys(options.servers).length > 0) {
      this.initPromise = this.initialize();
    }
  }

  public hasServers(): boolean {
    return Object.keys(this.servers).length > 0;
  }

  public async initialize(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.startAllServers();
    }
    return this.initPromise;
  }

  public async dispose(): Promise<void> {
    const disposals: Array<Promise<void>> = [];
    for (const managed of this.clients.values()) {
      disposals.push(managed.transport.close().catch(() => undefined));
    }
    this.clients.clear();
    await Promise.all(disposals);
  }

  public getToolDescriptors(): Array<McpToolDescriptor> {
    return [...this.descriptors];
  }

  public async listResources(params: {
    server?: string;
    cursor?: string;
  }): Promise<ListResourcesPayload> {
    await this.initialize();
    if (!this.clients.size) {
      throw new Error("No MCP servers are running.");
    }

    const serverName = params.server?.trim();
    if (serverName) {
      const managed = this.clients.get(serverName);
      if (!managed) {
        throw new Error(`MCP server '${serverName}' is not connected.`);
      }
      const result = await this.listResourcesForServer(
        managed,
        params.cursor?.trim(),
      );
      return formatListResourcesPayload(serverName, result);
    }

    if (params.cursor) {
      throw new Error("cursor can only be used when a server is specified.");
    }

    const aggregated = await this.listAllResources();
    return {
      resources: aggregated.flatMap(([server, resources]) =>
        resources.map((resource) => ({ server, resource })),
      ),
    };
  }

  public async listResourceTemplates(params: {
    server?: string;
    cursor?: string;
  }): Promise<ListResourceTemplatesPayload> {
    await this.initialize();
    if (!this.clients.size) {
      throw new Error("No MCP servers are running.");
    }

    const serverName = params.server?.trim();
    if (serverName) {
      const managed = this.clients.get(serverName);
      if (!managed) {
        throw new Error(`MCP server '${serverName}' is not connected.`);
      }
      const result = await this.listTemplatesForServer(
        managed,
        params.cursor?.trim(),
      );
      return formatListResourceTemplatesPayload(serverName, result);
    }

    if (params.cursor) {
      throw new Error("cursor can only be used when a server is specified.");
    }

    const aggregated = await this.listAllResourceTemplates();
    return {
      resourceTemplates: aggregated.flatMap(([server, templates]) =>
        templates.map((template) => ({ server, template })),
      ),
    };
  }

  public async readResource(params: {
    server: string;
    uri: string;
  }): Promise<ReadResourcePayload> {
    await this.initialize();
    const serverName = params.server.trim();
    const managed = this.clients.get(serverName);
    if (!managed) {
      throw new Error(`MCP server '${serverName}' is not connected.`);
    }

    const result = await managed.client.readResource(
      {
        uri: params.uri,
      },
      { timeout: managed.config.toolTimeoutMs },
    );
    return {
      server: serverName,
      uri: params.uri,
      result,
    };
  }

  public async callTool(
    serverName: string,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<McpToolInvocationResult> {
    await this.initialize();
    const managed = this.clients.get(serverName);
    if (!managed) {
      throw new Error(`MCP server '${serverName}' is not connected.`);
    }

    const result = await managed.client.callTool(
      {
        name: toolName,
        arguments: args,
      },
      { timeout: managed.config.toolTimeoutMs },
    );

    return {
      server: serverName,
      tool: toolName,
      content: result.content,
      structuredContent: result.structuredContent,
      isError: result.isError,
    };
  }

  private async startAllServers(): Promise<void> {
    const tasks = Object.entries(this.servers).map(([name, config]) =>
      this.startSingleServer(name, config),
    );
    await Promise.all(tasks);
  }

  private async startSingleServer(
    name: string,
    config: McpServerDefinition,
  ): Promise<void> {
    if (!config.enabled) {
      return;
    }

    try {
      const transport = await this.createTransport(config);
      const client = new Client(
        {
          name: "codex-cli",
          version: CLI_VERSION,
        },
        {
          capabilities: {
            resources: {},
            tools: {},
          },
        },
      );

      await transport.start();
      await client.connect(transport, { timeout: config.startupTimeoutMs });

      const tools = await this.fetchTools(name, client, config);
      const toolMap = new Map<string, McpTool>();
      for (const entry of tools) {
        toolMap.set(entry.tool.name, entry.tool);
        this.descriptors.push(entry.descriptor);
      }

      this.clients.set(name, {
        client,
        transport,
        config,
        tools: toolMap,
      });
    } catch (err) {
      log(
        `[mcp] Failed to start server '${name}': ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  private async createTransport(
    config: McpServerDefinition,
  ): Promise<Transport> {
    if (config.transport.type === "stdio") {
      return new StdioClientTransport({
        command: config.transport.command,
        args: config.transport.args,
        env: config.transport.env,
        cwd: config.transport.cwd,
      });
    }

    const url = new URL(config.transport.url);
    return new StreamableHTTPClientTransport(url, {
      requestInit: {
        headers: config.transport.headers,
      },
    });
  }

  private async fetchTools(
    serverName: string,
    client: Client,
    config: McpServerDefinition,
  ): Promise<
    Array<{ descriptor: McpToolDescriptor; tool: McpTool }>
  > {
    const collected: Array<{ descriptor: McpToolDescriptor; tool: McpTool }> =
      [];
    let cursor: string | undefined;

    const filter = buildToolFilter(config);

    do {
      const result: ListToolsResult = await client.listTools(
        cursor ? { cursor } : undefined,
        { timeout: config.toolTimeoutMs },
      );

      for (const tool of result.tools) {
        if (!filter(tool.name)) {
          continue;
        }
        const qualifiedName = qualifyToolName(serverName, tool.name);
        const descriptor: McpToolDescriptor = {
          qualifiedName,
          serverName,
          toolName: tool.name,
          functionTool: {
            type: "function",
            name: qualifiedName,
            description:
              tool.description ??
              `MCP tool ${tool.name} on server ${serverName}`,
            parameters: tool.inputSchema ?? {
              type: "object",
              properties: {},
              additionalProperties: true,
            },
          },
        };
        collected.push({ descriptor, tool });
      }

      cursor = result.nextCursor ?? undefined;
    } while (cursor);

    return collected;
  }

  private async listResourcesForServer(
    managed: ManagedClient,
    cursor?: string,
  ): Promise<ListResourcesResult> {
    const params = cursor ? { cursor } : undefined;
    return managed.client.listResources(params, {
      timeout: managed.config.toolTimeoutMs,
    });
  }

  private async listTemplatesForServer(
    managed: ManagedClient,
    cursor?: string,
  ): Promise<ListResourceTemplatesResult> {
    const params = cursor ? { cursor } : undefined;
    return managed.client.listResourceTemplates(params, {
      timeout: managed.config.toolTimeoutMs,
    });
  }

  private async listAllResources(): Promise<
    Array<[string, Array<Resource>]>
  > {
    const tasks = Array.from(this.clients.entries()).map(
      async ([server, managed]) => {
        const resources: Array<Resource> = [];
        let cursor: string | undefined;
        do {
          const result = await this.listResourcesForServer(managed, cursor);
          resources.push(...result.resources);
          cursor = result.nextCursor ?? undefined;
        } while (cursor);
        return [server, resources] as [string, Array<Resource>];
      },
    );

    const settled = await Promise.allSettled(tasks);
    const aggregated: Array<[string, Array<Resource>]> = [];
    for (const entry of settled) {
      if (entry.status === "fulfilled") {
        aggregated.push(entry.value);
      } else {
        log(
          `[mcp] Failed to list resources for one of the servers: ${entry.reason}`,
        );
      }
    }
    return aggregated;
  }

  private async listAllResourceTemplates(): Promise<
    Array<[string, Array<ResourceTemplate>]>
  > {
    const tasks = Array.from(this.clients.entries()).map(
      async ([server, managed]) => {
        const templates: Array<ResourceTemplate> = [];
        let cursor: string | undefined;
        do {
          const result = await this.listTemplatesForServer(managed, cursor);
          templates.push(...result.resourceTemplates);
          cursor = result.nextCursor ?? undefined;
        } while (cursor);
        return [server, templates] as [string, Array<ResourceTemplate>];
      },
    );

    const settled = await Promise.allSettled(tasks);
    const aggregated: Array<[string, Array<ResourceTemplate>]> = [];
    for (const entry of settled) {
      if (entry.status === "fulfilled") {
        aggregated.push(entry.value);
      } else {
        log(
          `[mcp] Failed to list resource templates for one of the servers: ${entry.reason}`,
        );
      }
    }
    return aggregated;
  }
}

type ListToolsResult = {
  tools: Array<McpTool>;
  nextCursor?: string | null;
};

function buildToolFilter(
  config: McpServerDefinition,
): (toolName: string) => boolean {
  const enabled = new Set(config.enabledTools ?? []);
  const disabled = new Set(config.disabledTools ?? []);

  if (!enabled.size && !disabled.size) {
    return () => true;
  }

  return (toolName: string) => {
    if (enabled.size && !enabled.has(toolName)) {
      return false;
    }
    if (disabled.size && disabled.has(toolName)) {
      return false;
    }
    return true;
  };
}

function qualifyToolName(server: string, tool: string): string {
  const base = `mcp${MCP_TOOL_NAME_DELIMITER}${server}${MCP_TOOL_NAME_DELIMITER}${tool}`;
  if (base.length <= MAX_TOOL_NAME_LENGTH) {
    return base;
  }
  const hash = createHash("sha1").update(base).digest("hex");
  const prefix = base.slice(0, MAX_TOOL_NAME_LENGTH - hash.length);
  return `${prefix}${hash}`;
}

function formatListResourcesPayload(
  server: string,
  result: ListResourcesResult,
): ListResourcesPayload {
  return {
    server,
    resources: result.resources.map((resource) => ({ server, resource })),
    nextCursor: result.nextCursor ?? undefined,
  };
}

function formatListResourceTemplatesPayload(
  server: string,
  result: ListResourceTemplatesResult,
): ListResourceTemplatesPayload {
  return {
    server,
    resourceTemplates: result.resourceTemplates.map((template) => ({
      server,
      template,
    })),
    nextCursor: result.nextCursor ?? undefined,
  };
}
