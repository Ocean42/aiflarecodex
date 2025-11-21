export type CliId = string;
export type SessionId = string;
export type FrontendClientId = string;

export type BackendToCliAction =
  | AttachSessionAction
  | DetachSessionAction
  | RunCommandAction
  | ApplyPatchAction
  | AgentToolCallAction;

export interface BackendToCliActionBase {
  actionId: string;
  sessionId: SessionId;
  createdAt: string;
}

export interface AttachSessionAction extends BackendToCliActionBase {
  type: "attach_session";
  workdir: string;
}

export interface DetachSessionAction extends BackendToCliActionBase {
  type: "detach_session";
  reason: "backend_shutdown" | "cli_shutdown" | "manual";
}

export interface RunCommandAction extends BackendToCliActionBase {
  type: "run_command";
  command: Array<string>;
  workdir: string;
  approvalRequired: boolean;
}

export interface ApplyPatchAction extends BackendToCliActionBase {
  type: "apply_patch";
  patch: string;
  workdir: string;
}

export interface AgentToolCallAction extends BackendToCliActionBase {
  type: "agent_tool_call";
  cliId: CliId;
  invocation: {
    name: string;
    args: unknown;
    callId: string;
  };
}

export type CliToBackendEvent =
  | CliActionAckEvent
  | CliActionResultEvent
  | CliHeartbeatEvent;

export interface CliEventBase {
  eventId: string;
  cliId: CliId;
  createdAt: string;
}

export interface CliActionAckEvent extends CliEventBase {
  type: "action_acknowledged";
  actionId: string;
  sessionId: SessionId;
}

export interface CliActionResultEvent extends CliEventBase {
  type: "action_result";
  actionId: string;
  sessionId: SessionId;
  success: boolean;
  stdout?: string;
  stderr?: string;
}

export interface CliHeartbeatEvent extends CliEventBase {
  type: "heartbeat";
  status: "idle" | "busy";
  activeSessions: Array<SessionId>;
}

export interface SessionSummary {
  id: SessionId;
  cliId: CliId;
  model: string;
  workdir: string;
  status: "waiting" | "running" | "error" | "completed";
  lastUpdated: string;
  title?: string;
}

export interface CliSummary {
  id: CliId;
  label: string;
  status: "connected" | "disconnected";
  lastSeen: string;
  sessionCount: number;
}

export type SessionEvent =
  | SessionMessageEvent
  | SessionPlanEvent
  | SessionToolCallStartedEvent
  | SessionToolCallOutputEvent
  | SessionExecEvent
  | SessionExecOutputEvent
  | SessionReasoningSummaryDeltaEvent
  | SessionReasoningContentDeltaEvent
  | SessionReasoningSectionBreakEvent;

export interface SessionEventBase {
  id: string;
  sessionId: SessionId;
  createdAt: string;
}

export interface SessionMessageEvent extends SessionEventBase {
  type: "message";
  role: "user" | "assistant" | "system" | "tool";
  content: Array<SessionMessageContentSegment>;
  state?: "streaming" | "completed";
  metadata?: Record<string, unknown>;
}

export type SessionMessageContentSegment =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "code";
      text: string;
      language?: string;
    }
  | {
      type: "tool_invocation";
      toolName: string;
      callId: string;
      arguments: unknown;
    }
  | {
      type: "tool_result";
      toolName: string;
      callId: string;
      status: "ok" | "error";
      output?: string;
      error?: string;
    };

export type PlanItemStatus = "pending" | "in_progress" | "completed" | "blocked";

export interface SessionPlanEvent extends SessionEventBase {
  type: "plan_update";
  explanation?: string;
  plan: Array<{
    id?: string;
    step: string;
    status: PlanItemStatus;
  }>;
}

export interface SessionToolCallStartedEvent extends SessionEventBase {
  type: "tool_call_started";
  callId: string;
  toolName: string;
}

export interface SessionToolCallOutputEvent extends SessionEventBase {
  type: "tool_call_output";
  callId: string;
  toolName: string;
  status: "ok" | "error";
  durationSeconds?: number;
  outputCount?: number;
  error?: string;
}

export type ExecEventPhase = "begin" | "end";

export interface SessionExecEvent extends SessionEventBase {
  type: "exec_event";
  phase: ExecEventPhase;
  callId?: string;
  command: Array<string>;
  cwd?: string;
  exitCode?: number;
  durationSeconds?: number;
}

export interface SessionExecOutputEvent extends SessionEventBase {
  type: "exec_output";
  callId?: string;
  stream: "stdout" | "stderr" | "combined";
  text: string;
}

export interface SessionReasoningSummaryDeltaEvent extends SessionEventBase {
  type: "reasoning_summary_delta";
  summaryIndex: number;
  delta: string;
}

export interface SessionReasoningContentDeltaEvent extends SessionEventBase {
  type: "reasoning_content_delta";
  contentIndex: number;
  delta: string;
}

export interface SessionReasoningSectionBreakEvent extends SessionEventBase {
  type: "reasoning_section_break";
  summaryIndex: number;
}

export type FrontendDelta =
  | {
      type: "cli_list_updated";
      clis: Array<CliSummary>;
    }
  | {
      type: "session_list_updated";
      sessions: Array<SessionSummary>;
    }
  | {
      type: "approval_requested";
      sessionId: SessionId;
      actionId: string;
      command: Array<string>;
    };

export type FrontendCommand =
  | {
      type: "create_session";
      cliId: CliId;
      workdir: string;
      model: string;
      prompt: string;
    }
  | {
      type: "send_prompt";
      sessionId: SessionId;
      prompt: string;
    }
  | {
      type: "approve_action";
      sessionId: SessionId;
      actionId: string;
      approved: boolean;
      explanation?: string;
    };

export interface BootstrapState {
  clis: Array<CliSummary>;
  sessions: Array<SessionSummary>;
  actions: Array<{
    actionId: string;
    cliId: CliId;
    sessionId?: SessionId;
    payload: unknown;
  }>;
  timeline: Record<SessionId, Array<SessionEvent>>;
}
