// @ts-nocheck
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createHash } from "node:crypto";
import { CLI_VERSION } from "../../version.js";
import { log } from "../logger/log.js";
const MCP_TOOL_NAME_DELIMITER = "__";
const MAX_TOOL_NAME_LENGTH = 64;
export class McpConnectionManager {
    servers;
    descriptors = [];
    clients = new Map();
    initPromise = null;
    constructor(options) {
        this.servers = options.servers;
        if (Object.keys(options.servers).length > 0) {
            this.initPromise = this.initialize();
        }
    }
    hasServers() {
        return Object.keys(this.servers).length > 0;
    }
    async initialize() {
        if (!this.initPromise) {
            this.initPromise = this.startAllServers();
        }
        return this.initPromise;
    }
    async dispose() {
        const disposals = [];
        for (const managed of this.clients.values()) {
            disposals.push(managed.transport.close().catch(() => undefined));
        }
        this.clients.clear();
        await Promise.all(disposals);
    }
    getToolDescriptors() {
        return [...this.descriptors];
    }
    async listResources(params) {
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
            const result = await this.listResourcesForServer(managed, params.cursor?.trim());
            return formatListResourcesPayload(serverName, result);
        }
        if (params.cursor) {
            throw new Error("cursor can only be used when a server is specified.");
        }
        const aggregated = await this.listAllResources();
        return {
            resources: aggregated.flatMap(([server, resources]) => resources.map((resource) => ({ server, resource }))),
        };
    }
    async listResourceTemplates(params) {
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
            const result = await this.listTemplatesForServer(managed, params.cursor?.trim());
            return formatListResourceTemplatesPayload(serverName, result);
        }
        if (params.cursor) {
            throw new Error("cursor can only be used when a server is specified.");
        }
        const aggregated = await this.listAllResourceTemplates();
        return {
            resourceTemplates: aggregated.flatMap(([server, templates]) => templates.map((template) => ({ server, template }))),
        };
    }
    async readResource(params) {
        await this.initialize();
        const serverName = params.server.trim();
        const managed = this.clients.get(serverName);
        if (!managed) {
            throw new Error(`MCP server '${serverName}' is not connected.`);
        }
        const result = await managed.client.readResource({
            uri: params.uri,
        }, { timeout: managed.config.toolTimeoutMs });
        return {
            server: serverName,
            uri: params.uri,
            result,
        };
    }
    async callTool(serverName, toolName, args) {
        await this.initialize();
        const managed = this.clients.get(serverName);
        if (!managed) {
            throw new Error(`MCP server '${serverName}' is not connected.`);
        }
        const result = await managed.client.callTool({
            name: toolName,
            arguments: args,
        }, { timeout: managed.config.toolTimeoutMs });
        return {
            server: serverName,
            tool: toolName,
            content: result.content,
            structuredContent: result.structuredContent,
            isError: result.isError,
        };
    }
    async startAllServers() {
        const tasks = Object.entries(this.servers).map(([name, config]) => this.startSingleServer(name, config));
        await Promise.all(tasks);
    }
    async startSingleServer(name, config) {
        if (!config.enabled) {
            return;
        }
        try {
            const transport = await this.createTransport(config);
            const client = new Client({
                name: "codex-cli",
                version: CLI_VERSION,
            }, {
                capabilities: {
                    resources: {},
                    tools: {},
                },
            });
            await transport.start();
            await client.connect(transport, { timeout: config.startupTimeoutMs });
            const tools = await this.fetchTools(name, client, config);
            const toolMap = new Map();
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
        }
        catch (err) {
            log(`[mcp] Failed to start server '${name}': ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    async createTransport(config) {
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
    async fetchTools(serverName, client, config) {
        const collected = [];
        let cursor;
        const filter = buildToolFilter(config);
        do {
            const result = await client.listTools(cursor ? { cursor } : undefined, { timeout: config.toolTimeoutMs });
            for (const tool of result.tools) {
                if (!filter(tool.name)) {
                    continue;
                }
                const qualifiedName = qualifyToolName(serverName, tool.name);
                const descriptor = {
                    qualifiedName,
                    serverName,
                    toolName: tool.name,
                    functionTool: {
                        type: "function",
                        name: qualifiedName,
                        description: tool.description ??
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
    async listResourcesForServer(managed, cursor) {
        const params = cursor ? { cursor } : undefined;
        return managed.client.listResources(params, {
            timeout: managed.config.toolTimeoutMs,
        });
    }
    async listTemplatesForServer(managed, cursor) {
        const params = cursor ? { cursor } : undefined;
        return managed.client.listResourceTemplates(params, {
            timeout: managed.config.toolTimeoutMs,
        });
    }
    async listAllResources() {
        const tasks = Array.from(this.clients.entries()).map(async ([server, managed]) => {
            const resources = [];
            let cursor;
            do {
                const result = await this.listResourcesForServer(managed, cursor);
                resources.push(...result.resources);
                cursor = result.nextCursor ?? undefined;
            } while (cursor);
            return [server, resources];
        });
        const settled = await Promise.allSettled(tasks);
        const aggregated = [];
        for (const entry of settled) {
            if (entry.status === "fulfilled") {
                aggregated.push(entry.value);
            }
            else {
                log(`[mcp] Failed to list resources for one of the servers: ${entry.reason}`);
            }
        }
        return aggregated;
    }
    async listAllResourceTemplates() {
        const tasks = Array.from(this.clients.entries()).map(async ([server, managed]) => {
            const templates = [];
            let cursor;
            do {
                const result = await this.listTemplatesForServer(managed, cursor);
                templates.push(...result.resourceTemplates);
                cursor = result.nextCursor ?? undefined;
            } while (cursor);
            return [server, templates];
        });
        const settled = await Promise.allSettled(tasks);
        const aggregated = [];
        for (const entry of settled) {
            if (entry.status === "fulfilled") {
                aggregated.push(entry.value);
            }
            else {
                log(`[mcp] Failed to list resource templates for one of the servers: ${entry.reason}`);
            }
        }
        return aggregated;
    }
}
function buildToolFilter(config) {
    const enabled = new Set(config.enabledTools ?? []);
    const disabled = new Set(config.disabledTools ?? []);
    if (!enabled.size && !disabled.size) {
        return () => true;
    }
    return (toolName) => {
        if (enabled.size && !enabled.has(toolName)) {
            return false;
        }
        if (disabled.size && disabled.has(toolName)) {
            return false;
        }
        return true;
    };
}
function qualifyToolName(server, tool) {
    const base = `mcp${MCP_TOOL_NAME_DELIMITER}${server}${MCP_TOOL_NAME_DELIMITER}${tool}`;
    if (base.length <= MAX_TOOL_NAME_LENGTH) {
        return base;
    }
    const hash = createHash("sha1").update(base).digest("hex");
    const prefix = base.slice(0, MAX_TOOL_NAME_LENGTH - hash.length);
    return `${prefix}${hash}`;
}
function formatListResourcesPayload(server, result) {
    return {
        server,
        resources: result.resources.map((resource) => ({ server, resource })),
        nextCursor: result.nextCursor ?? undefined,
    };
}
function formatListResourceTemplatesPayload(server, result) {
    return {
        server,
        resourceTemplates: result.resourceTemplates.map((template) => ({
            server,
            template,
        })),
        nextCursor: result.nextCursor ?? undefined,
    };
}
