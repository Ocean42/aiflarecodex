import { execApplyPatch } from "./exec.js";
import type { ExecOutputMetadata } from "./sandbox/interface.js";

export type ApplyPatchToolArgs = {
  patch: string;
  workdir?: string;
};

export type ApplyPatchToolResult = {
  output: string;
  metadata: ExecOutputMetadata;
  stderr: string;
  exitCode: number;
};

export function runApplyPatchTool({
  patch,
  workdir,
}: ApplyPatchToolArgs): ApplyPatchToolResult {
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
