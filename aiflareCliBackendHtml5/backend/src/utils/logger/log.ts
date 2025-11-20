// @ts-nocheck
import * as fsSync from "fs";
import * as fs from "fs/promises";
import * as path from "path";
class AsyncLogger {
    filePath;
    queue = [];
    isWriting = false;
    constructor(filePath) {
        this.filePath = filePath;
        this.filePath = filePath;
    }
    isLoggingEnabled() {
        return true;
    }
    log(message) {
        const entry = `[${now()}] ${message}\n`;
        this.queue.push(entry);
        this.maybeWrite();
    }
    async maybeWrite() {
        if (this.isWriting || this.queue.length === 0) {
            return;
        }
        this.isWriting = true;
        const messages = this.queue.join("");
        this.queue = [];
        try {
            await fs.appendFile(this.filePath, messages);
        }
        finally {
            this.isWriting = false;
        }
        this.maybeWrite();
    }
}
class EmptyLogger {
    isLoggingEnabled() {
        return false;
    }
    log(_message) {
        // No-op
    }
}
function now() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}
let logger;
/**
 * Creates a .log file for this session inside the current working directory
 * under `log/`, and symlinks `codex-cli-latest.log` to the current file so you
 * can reliably run:
 *
 *   tail -F log/codex-cli-latest.log
 */
export function initLogger() {
    if (logger) {
        return logger;
    }
    const logDir = path.join(process.cwd(), "log");
    fsSync.mkdirSync(logDir, { recursive: true });
    const isVitest = typeof globalThis.vitest !== "undefined" ||
        typeof process.env["VITEST_WORKER_ID"] === "string";
    let logFile;
    if (isVitest) {
        // For test runs, always write to a fixed, predictable filename so it's
        // easy to inspect after `vitest` has finished.
        logFile = path.join(logDir, "test.log");
        fsSync.writeFileSync(logFile, "");
    }
    else {
        logFile = path.join(logDir, `codex-cli-${now()}.log`);
        fsSync.writeFileSync(logFile, "");
        const latestLink = path.join(logDir, "codex-cli-latest.log");
        try {
            fsSync.symlinkSync(logFile, latestLink, "file");
        }
        catch (err) {
            const error = err;
            if (error.code === "EEXIST") {
                fsSync.unlinkSync(latestLink);
                fsSync.symlinkSync(logFile, latestLink, "file");
            }
            // On platforms where symlinks are not permitted, we silently ignore other errors.
        }
    }
    logger = new AsyncLogger(logFile);
    return logger;
}
export function log(message) {
    (logger ?? initLogger()).log(message);
}
export function getLogDir() {
    const logDir = path.join(process.cwd(), "log");
    fsSync.mkdirSync(logDir, { recursive: true });
    return logDir;
}
export function isLoggingEnabled() {
    return (logger ?? initLogger()).isLoggingEnabled();
}
