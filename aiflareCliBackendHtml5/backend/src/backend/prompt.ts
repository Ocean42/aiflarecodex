// @ts-nocheck
export function promptToResponsesTurn(prompt, ctx) {
    const mergedInstructions = prompt.baseInstructionsOverride &&
        prompt.baseInstructionsOverride.trim() !== ""
        ? prompt.baseInstructionsOverride
        : ctx.instructions;
    return {
        model: ctx.model,
        instructions: mergedInstructions,
        input: prompt.input,
        tools: prompt.tools,
        parallelToolCalls: prompt.parallelToolCalls,
        disableResponseStorage: ctx.disableResponseStorage,
        previousResponseId: ctx.previousResponseId,
        reasoning: ctx.reasoning,
        flexMode: ctx.flexMode,
        config: ctx.config,
        include: ctx.include,
        promptCacheKey: ctx.promptCacheKey,
    };
}
