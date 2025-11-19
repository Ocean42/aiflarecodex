import type { PlanUpdatePayload } from "./plan-utils.js";
import type { ResponseItem } from "openai/resources/responses/responses.mjs";

export type PlanUpdateEvent = {
  agentEvent: true;
  type: "plan_update";
  id: string;
  payload: PlanUpdatePayload;
};

export type ExecEventPhase = "begin" | "end";

export type ExecEventItem = {
  agentEvent: true;
  type: "exec_event";
  id: string;
  phase: ExecEventPhase;
  callId?: string;
  command: Array<string>;
  cwd?: string;
  exitCode?: number;
  durationSeconds?: number;
};

export type ReasoningSummaryDeltaEvent = {
  agentEvent: true;
  type: "reasoning_summary_delta";
  id: string;
  delta: string;
  summaryIndex: number;
};

export type ReasoningContentDeltaEvent = {
  agentEvent: true;
  type: "reasoning_content_delta";
  id: string;
  delta: string;
  contentIndex: number;
};

export type ReasoningSectionBreakEvent = {
  agentEvent: true;
  type: "reasoning_section_break";
  id: string;
  summaryIndex: number;
};

export type AgentResponseItem =
  | ResponseItem
  | PlanUpdateEvent
  | ExecEventItem
  | ReasoningSummaryDeltaEvent
  | ReasoningContentDeltaEvent
  | ReasoningSectionBreakEvent;

export function isAgentGeneratedEvent(
  item: AgentResponseItem,
): item is
  | PlanUpdateEvent
  | ExecEventItem
  | ReasoningSummaryDeltaEvent
  | ReasoningContentDeltaEvent
  | ReasoningSectionBreakEvent {
  return Boolean((item as { agentEvent?: boolean }).agentEvent);
}

export function isNativeResponseItem(
  item: AgentResponseItem,
): item is ResponseItem {
  return !isAgentGeneratedEvent(item);
}
