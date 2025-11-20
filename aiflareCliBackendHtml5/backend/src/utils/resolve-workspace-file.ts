// @ts-nocheck
import fs from "node:fs/promises";
import path from "node:path";
const SKIP_DIRS = new Set([
    ".git",
    "node_modules",
    ".pnpm",
    ".turbo",
    ".next",
    "dist",
    "build",
    "target",
    "venv",
    ".venv",
    ".direnv",
]);
const fileCache = new Map();
async function pathExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    }
    catch {
        return false;
    }
}
async function findByBasename(root, baseName) {
    const stack = [root];
    const visited = new Set();
    const MAX_VISITED = 4000;
    while (stack.length > 0 && visited.size < MAX_VISITED) {
        const dir = stack.pop();
        if (visited.has(dir)) {
            continue;
        }
        visited.add(dir);
        let entries;
        try {
            entries = await fs.readdir(dir, { withFileTypes: true });
        }
        catch {
            continue;
        }
        for (const entry of entries) {
            const entryPath = path.join(dir, entry.name);
            if (entry.isFile() && entry.name === baseName) {
                return entryPath;
            }
            if (entry.isDirectory() &&
                !SKIP_DIRS.has(entry.name) &&
                !entry.name.startsWith(".cache")) {
                stack.push(entryPath);
            }
        }
    }
    return null;
}
export async function resolveWorkspaceFile(rawPath) {
    const normalized = rawPath.trim();
    if (normalized === "") {
        throw new Error("empty path");
    }
    if (fileCache.has(normalized)) {
        return fileCache.get(normalized);
    }
    const absolute = path.isAbsolute(normalized)
        ? normalized
        : path.resolve(process.cwd(), normalized);
    if (await pathExists(absolute)) {
        fileCache.set(normalized, absolute);
        return absolute;
    }
    const baseName = path.basename(normalized);
    if (baseName !== normalized) {
        throw new Error(`Unable to find file at '${normalized}'`);
    }
    const discovered = await findByBasename(process.cwd(), baseName);
    if (!discovered) {
        throw new Error(`Unable to locate '${normalized}' within the workspace`);
    }
    fileCache.set(normalized, discovered);
    return discovered;
}
