// @ts-nocheck
import { log } from "./logger/log.js";
import { spawn } from "child_process";
export function notifyTurnComplete(config, payload) {
    const command = config.notifyCommand;
    if (!command || command.length === 0) {
        return;
    }
    const [program, ...rest] = command;
    if (!program) {
        return;
    }
    const args = [...rest, JSON.stringify(payload)];
    try {
        const child = spawn(program, args, {
            detached: true,
            stdio: "ignore",
        });
        child.on("error", (err) => {
            log(`notify command failed (${program}): ${err instanceof Error ? err.message : String(err)}`);
        });
        child.unref();
    }
    catch (err) {
        log(`notify command spawn error (${program}): ${err instanceof Error ? err.message : String(err)}`);
    }
}
