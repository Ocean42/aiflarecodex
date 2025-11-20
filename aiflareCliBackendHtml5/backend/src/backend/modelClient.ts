// @ts-nocheck
export function createResponsesRequest(turn) {
    const { model, instructions, input, tools } = turn;
    const baseInclude = turn.include ?? ["reasoning.encrypted_content"];
    const base = {
        model,
        instructions,
        input,
        stream: true,
        parallel_tool_calls: turn.parallelToolCalls,
        reasoning: turn.reasoning,
        ...(turn.flexMode ? { service_tier: "flex" } : {}),
        tools,
        include: baseInclude,
        tool_choice: "auto",
    };
    const request = turn.disableResponseStorage
        ? {
            ...base,
            store: false,
        }
        : {
            ...base,
            store: true,
            previous_response_id: turn.previousResponseId && turn.previousResponseId.trim() !== ""
                ? turn.previousResponseId
                : undefined,
        };
    if (turn.promptCacheKey) {
        request.prompt_cache_key = turn.promptCacheKey;
    }
    return request;
}
export async function startResponsesStream(client, params) {
    // The OpenAI client returns an async iterable when `stream: true` is set.
    // We keep the return type intentionally loose here (`AsyncIterable<unknown>`)
    // so callers can cast to the concrete event type they expect (e.g.
    // `AsyncIterable<ResponseEvent>`).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyClient = client;
    return anyClient.responses.create(params);
}
