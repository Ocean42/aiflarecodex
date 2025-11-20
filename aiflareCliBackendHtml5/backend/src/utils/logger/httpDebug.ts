// @ts-nocheck
import fs from "node:fs";
import path from "node:path";
import { getLogDir, log } from "./log.js";
const INLINE_BODY_LIMIT = 512;
let sequence = 0;
function persistBody(body) {
    const logDir = getLogDir();
    const fileName = `http-${Date.now()}-${sequence++}.json`;
    const fullPath = path.join(logDir, fileName);
    fs.writeFileSync(fullPath, body, "utf-8");
    return fullPath;
}
export function logHttpDebug(entry) {
    const { phase, method } = entry;
    let { url } = entry;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = url.startsWith("/")
            ? `http://localhost${url}`
            : `http://localhost/${url}`;
    }
    let host = "<unknown>";
    let port = "<unknown>";
    try {
        const parsed = new URL(url);
        host = parsed.hostname;
        port = parsed.port || (parsed.protocol === "https:" ? "443" : "80");
    }
    catch {
        // ignore parse errors
    }
    const headers = entry.headers ?? [];
    const extra = entry.extra &&
        Object.entries(entry.extra)
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => `${key}=${String(value)}`)
            .join(" ");
    let bodyDescriptor = "<none>";
    if (entry.body) {
        if (entry.body.length <= INLINE_BODY_LIMIT) {
            bodyDescriptor = entry.body;
        }
        else {
            const storedPath = persistBody(entry.body);
            bodyDescriptor = `@${storedPath}`;
        }
    }
    log(`[HTTPDEBUG] ${phase.toUpperCase()} method=${method} url=${entry.url} host=${host} port=${port} headers=${JSON.stringify(headers)} body=${bodyDescriptor}${entry.tag ? ` tag=${entry.tag}` : ""}${extra ? ` ${extra}` : ""}`);
    return bodyDescriptor;
}
