import type { CliId } from "@aiflare/protocol";
import os from "node:os";
import { spawn } from "node:child_process";
import { ConfigStore, type CliWorkerConfig } from "./config/configStore.js";
import { BackendClient } from "./net/backendClient.js";
import { runLocalCodexLogin } from "./login/localLogin.js";
import { ActionTracker } from "./utils/actionTracker.js";

export interface CliWorkerAppOptions {
  configStore?: ConfigStore;
}

export class CliWorkerApp {
  private readonly configStore: ConfigStore;
  private backendClient: BackendClient | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private actionPollingTimer: NodeJS.Timeout | null = null;
  private currentConfig: CliWorkerConfig | null = null;
  private readonly actionTracker = new ActionTracker();

  constructor(options?: CliWorkerAppOptions) {
    const overridePath = process.env["CLI_CONFIG_PATH"];
    this.configStore = options?.configStore ?? new ConfigStore(overridePath);
  }

  async run(): Promise<void> {
    const config = await this.ensureConfig();
    this.currentConfig = config;
    this.backendClient = new BackendClient(config.backendUrl, config.cliId);
    if (config.sessionToken) {
      this.backendClient.setSessionToken(config.sessionToken);
    }
    await this.registerWithBackend();
    this.startHeartbeat();
    this.startActionPolling();
    console.log(`[cli-worker] ready as ${config.cliId} → ${config.backendUrl}`);
  }

  private async ensureConfig(): Promise<CliWorkerConfig> {
    const existing = await this.configStore.load();
    if (existing) {
      return existing;
    }

    const generated: CliWorkerConfig = {
      cliId: this.generateCliId(),
      backendUrl: process.env["BACKEND_URL"] ?? "http://localhost:4123",
      sessionToken: "",
      label: process.env["CLI_LABEL"] ?? `cli-${os.hostname()}`,
      lastUpdated: new Date().toISOString(),
    };
    await this.configStore.save(generated);
    return generated;
  }

  private generateCliId(): CliId {
    return `cli_${Math.random().toString(36).slice(2, 10)}`;
  }

  private async registerWithBackend(): Promise<void> {
    if (!this.backendClient || !this.currentConfig) return;
    const result = await this.backendClient.register(
      this.currentConfig.label,
      this.currentConfig.sessionToken,
    );
    if (!this.currentConfig.sessionToken || this.currentConfig.sessionToken !== result.token) {
      this.currentConfig.sessionToken = result.token;
      await this.configStore.save(this.currentConfig);
    }
    this.backendClient.setSessionToken(this.currentConfig.sessionToken);
  }

  private startHeartbeat(): void {
    if (!this.backendClient || !this.currentConfig) return;
    const send = async () => {
      try {
        if (!this.backendClient || !this.currentConfig) {
          return;
        }
        await this.backendClient.heartbeat(this.currentConfig.sessionToken);
      } catch (error) {
        console.error("[cli-worker] heartbeat failed", error);
        await this.handleHeartbeatFailure(error);
      }
    };
    void send();
    this.heartbeatTimer = setInterval(send, 10_000);
  }

  private async handleHeartbeatFailure(error: unknown): Promise<void> {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("401") || message.includes("unauthorized")) {
      console.warn("[cli-worker] re-registering after unauthorized heartbeat");
      await this.registerWithBackend();
      return;
    }
    console.warn("[cli-worker] heartbeat error, retrying later");
  }

  private startActionPolling(): void {
    if (!this.backendClient || !this.currentConfig) return;
    const poll = async () => {
      try {
        if (!this.backendClient || !this.currentConfig) {
          return;
        }
        console.log("[cli-worker] polling backend for actions…");
        const actions = await this.backendClient.listActions();
        if (actions.length > 0) {
          console.log("[cli-worker] received actions", {
            count: actions.length,
            ids: actions.map((a) => a.actionId),
          });
        }
        if (actions && actions.length > 0) {
          for (const action of actions) {
            if (!this.actionTracker.begin(action.actionId)) {
              continue;
            }
            try {
              await this.handleAction(action);
              await this.backendClient.acknowledgeAction(action.actionId);
            } finally {
              this.actionTracker.end(action.actionId);
            }
          }
        }
      } catch (error) {
        console.error("[cli-worker] action poll failed", error);
      }
    };
    void poll();
    this.actionPollingTimer = setInterval(poll, 5000);
  }

  private async handleAction(action: {
    actionId: string;
    payload: unknown;
    sessionId?: string;
  }): Promise<void> {
    const payload = action.payload as { type?: string; sessionId?: string; workdir?: string; command?: Array<string> };
    const type = payload?.type ?? "unknown";
    const baseInfo = {
      actionId: action.actionId,
      type,
      sessionId: payload?.sessionId ?? action.sessionId,
    };
    switch (type) {
      case "noop":
        console.log("[cli-worker] noop action", {
          ...baseInfo,
          workdir: payload?.workdir,
        });
        break;
      case "run_command":
        console.log("[cli-worker] run_command action", {
          ...baseInfo,
          workdir: payload?.workdir,
          command: payload?.command ?? [],
        });
        await this.runCommandAction(payload);
        break;
      case "agent_tool_call":
        await this.handleAgentToolAction(payload);
        break;
      case "login_request":
        await this.handleLoginRequest();
        break;
      default:
        console.log("[cli-worker] unhandled action", { ...baseInfo, payload });
        break;
    }
  }

  private async runCommandAction(payload: {
    command?: Array<string>;
    workdir?: string;
  }): Promise<void> {
    const command = payload.command ?? [];
    if (command.length === 0) {
      console.warn("[cli-worker] run_command missing command payload");
      return;
    }
    const result = await this.spawnCommand(
      command,
      payload.workdir && payload.workdir.length > 0 ? payload.workdir : process.cwd(),
    );
    console.log("[cli-worker] run_command finished", {
      command,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
    });
  }

  private async handleAgentToolAction(payload: {
    invocation?: {
      name?: string;
      args?: unknown;
      callId?: string;
    };
    sessionId?: string;
    workdir?: string;
  }): Promise<void> {
    if (!this.backendClient) {
      console.warn("[cli-worker] no backend client for tool call");
      return;
    }
    const invocation = payload.invocation;
    const sessionId = payload.sessionId;
    if (!invocation || !sessionId) {
      console.warn("[cli-worker] invalid agent_tool_call payload", payload);
      return;
    }
    console.log("[cli-worker] agent_tool_call", {
      sessionId,
      workdir: payload.workdir,
      tool: invocation.name,
    });
    const callId = invocation.callId ?? `call_${Date.now()}`;
    try {
      let outputs: Array<{ call_id: string; type: string; output: string }>;
      switch (invocation.name) {
        case "shell":
        case "local_shell_call":
          outputs = await this.executeShellTool(invocation, callId, payload.workdir);
          break;
        default:
          outputs = [
            {
              type: "function_call_output",
              call_id: callId,
              output: JSON.stringify({
                error: `Unsupported tool ${invocation.name}`,
              }),
            },
          ];
          break;
      }
      await this.backendClient.submitToolResult(sessionId, callId, outputs);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.backendClient.submitToolResult(sessionId, callId, [
        {
          type: "function_call_output",
          call_id: callId,
          output: JSON.stringify({ error: errorMessage }),
        },
      ]);
    }
  }

  private async executeShellTool(
    invocation: { args?: unknown },
    callId: string,
    workdirOverride?: string,
  ): Promise<Array<{ call_id: string; type: string; output: string }>> {
    const execInput = invocation.args as
      | { cmd?: Array<string>; workdir?: string }
      | undefined;
    const command = execInput?.cmd ?? [];
    if (command.length === 0) {
      throw new Error("shell tool missing command");
    }
    const workdir =
      workdirOverride && workdirOverride.length > 0
        ? workdirOverride
        : execInput?.workdir && execInput.workdir.length > 0
          ? execInput.workdir
          : process.cwd();
    const startedAt = Date.now();
    const { stdout, stderr, exitCode } = await this.spawnCommand(command, workdir);
    const durationSeconds = (Date.now() - startedAt) / 1000;
    return [
      {
        type: "function_call_output",
        call_id: callId,
        output: JSON.stringify({
          output: stdout,
          metadata: {
            exit_code: exitCode ?? 0,
            duration_seconds: durationSeconds,
            stderr,
          },
        }),
      },
    ];
  }

  private async spawnCommand(
    command: Array<string>,
    workdir: string,
  ): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
    console.log("[cli-worker] spawn_command", { command, workdir });
    return await new Promise((resolve) => {
      const child = spawn(command[0]!, command.slice(1), {
        cwd: workdir,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stdout = "";
      let stderr = "";
      child.stdout?.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr?.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      child.on("close", (code) => {
        resolve({ stdout: stdout.trim(), stderr: stderr.trim(), exitCode: code });
      });
    });
  }

  private async handleLoginRequest(): Promise<void> {
      if (!this.backendClient || !this.currentConfig) {
        console.warn("[cli-worker] cannot process login_request – not ready");
        return;
      }
    console.log("[cli-worker] Starting Codex login flow locally...");
    try {
      const authData = await runLocalCodexLogin();
      await this.backendClient.uploadAuthData(
        this.currentConfig.sessionToken,
        authData,
      );
      console.log("[cli-worker] Codex login completed and uploaded to backend.");
    } catch (error) {
      console.error("[cli-worker] Codex login failed", error);
      try {
        await this.backendClient.cancelLogin();
      } catch (cancelError) {
        console.warn("[cli-worker] failed to notify backend about login cancel", cancelError);
      }
    }
  }
}

export function createCliWorkerApp(options?: CliWorkerAppOptions): CliWorkerApp {
  return new CliWorkerApp(options);
}
