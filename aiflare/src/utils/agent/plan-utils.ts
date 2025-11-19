type PlanItemStatus = "pending" | "in_progress" | "completed";

export type PlanItem = {
  step: string;
  status: PlanItemStatus;
};

export type PlanUpdatePayload = {
  explanation?: string;
  plan: Array<PlanItem>;
};

const STATUS_LABEL: Record<PlanItemStatus, string> = {
  pending: "[ ]",
  in_progress: "[~]",
  completed: "[x]",
};

export function formatPlanUpdate(payload: PlanUpdatePayload): string {
  const lines: Array<string> = [];
  lines.push("Plan update:");
  if (payload.explanation?.trim()) {
    lines.push(payload.explanation.trim());
  }

  for (const item of payload.plan) {
    const label = STATUS_LABEL[item.status] ?? "[?]";
    lines.push(`${label} ${item.step}`);
  }

  return lines.join("\n");
}

export function parsePlanUpdateArgs(
  raw: unknown,
): PlanUpdatePayload | { error: string } {
  if (typeof raw !== "object" || raw == null) {
    return { error: "update_plan arguments must be an object" };
  }

  const plan = (raw as { plan?: unknown }).plan;
  if (!Array.isArray(plan)) {
    return { error: "update_plan requires a plan array" };
  }

  const parsedPlan: Array<PlanItem> = [];
  for (const item of plan) {
    if (
      !item ||
      typeof item !== "object" ||
      typeof (item as { step?: unknown }).step !== "string" ||
      typeof (item as { status?: unknown }).status !== "string"
    ) {
      return { error: "update_plan entries need step and status" };
    }
    const status = (item as { status: string }).status as PlanItemStatus;
    if (!STATUS_LABEL[status]) {
      return { error: `Unknown plan status: ${status}` };
    }
    parsedPlan.push({
      step: (item as { step: string }).step,
      status,
    });
  }

  const explanation =
    typeof (raw as { explanation?: unknown }).explanation === "string"
      ? ((raw as { explanation?: string }).explanation as string)
      : undefined;

  return { explanation, plan: parsedPlan };
}
