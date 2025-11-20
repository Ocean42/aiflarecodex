export type CliId = string;
export type SessionId = string;
export type FrontendClientId = string;

export type BackendToCliAction =
  | AttachSessionAction
  | DetachSessionAction
  | RunCommandAction
  | ApplyPatchAction;

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
}

export interface CliSummary {
  id: CliId;
  label: string;
  status: "connected" | "disconnected";
  lastSeen: string;
  sessionCount: number;
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
