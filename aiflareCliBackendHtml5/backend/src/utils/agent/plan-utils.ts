// @ts-nocheck
const STATUS_LABEL = {
    pending: "[ ]",
    in_progress: "[~]",
    completed: "[x]",
};
export function formatPlanUpdate(payload) {
    const lines = [];
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
export function parsePlanUpdateArgs(raw) {
    if (typeof raw !== "object" || raw == null) {
        return { error: "update_plan arguments must be an object" };
    }
    const plan = raw.plan;
    if (!Array.isArray(plan)) {
        return { error: "update_plan requires a plan array" };
    }
    const parsedPlan = [];
    for (const item of plan) {
        if (!item ||
            typeof item !== "object" ||
            typeof item.step !== "string" ||
            typeof item.status !== "string") {
            return { error: "update_plan entries need step and status" };
        }
        const status = item.status;
        if (!STATUS_LABEL[status]) {
            return { error: `Unknown plan status: ${status}` };
        }
        parsedPlan.push({
            step: item.step,
            status,
        });
    }
    const explanation = typeof raw.explanation === "string"
        ? raw.explanation
        : undefined;
    return { explanation, plan: parsedPlan };
}
