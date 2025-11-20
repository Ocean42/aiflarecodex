// @ts-nocheck
import { execApplyPatch } from "./exec.js";
export function runApplyPatchTool({ patch, workdir, }) {
    const start = Date.now();
    const { stdout, stderr, exitCode } = execApplyPatch(patch, workdir);
    const duration = Date.now() - start;
    return {
        output: stdout || stderr,
        stderr,
        exitCode,
        metadata: {
            exit_code: exitCode,
            duration_seconds: Math.round(duration / 100) / 10,
        },
    };
}
