// @ts-nocheck
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { resolveWorkspaceFile } from "../resolve-workspace-file.js";
const MAX_LINE_LENGTH = 500;
const TAB_WIDTH = 4;
const READ_FILE_DEFAULT_OFFSET = 1;
const READ_FILE_DEFAULT_LIMIT = 2000;
const LIST_DIR_DEFAULT_OFFSET = 1;
const LIST_DIR_DEFAULT_LIMIT = 25;
const LIST_DIR_DEFAULT_DEPTH = 2;
const INDENTATION_SPACES = 2;
const COMMENT_PREFIXES = ["#", "//", "--"];
const GREP_DEFAULT_LIMIT = 100;
const GREP_MAX_LIMIT = 2000;
const RG_TIMEOUT_MS = 30_000;
export async function runReadFileTool(rawArgs) {
    const args = await normalizeReadFileArgs(rawArgs);
    const records = await collectFileLines(args.filePath);
    if (records.length === 0) {
        throw new Error("file is empty");
    }
    const lines = args.mode === "indentation"
        ? readIndentationBlock(records, args)
        : readSlice(records, args);
    const outputLines = [`Absolute path: ${args.filePath}`, ...lines];
    return {
        output: outputLines.join("\n"),
        absolutePath: args.filePath,
    };
}
export async function runListDirTool(rawArgs) {
    const args = await normalizeListDirArgs(rawArgs);
    const entries = await collectEntries(args.dirPath, args.depth);
    if (entries.length === 0) {
        const header = `Absolute path: ${args.dirPath}`;
        return { output: header, absolutePath: args.dirPath };
    }
    const startIndex = args.offset - 1;
    if (startIndex >= entries.length) {
        throw new Error("offset exceeds directory entry count");
    }
    const remainingEntries = entries.length - startIndex;
    const cappedLimit = Math.min(args.limit, remainingEntries);
    const endIndex = startIndex + cappedLimit;
    const selected = entries.slice(startIndex, endIndex).sort((a, b) => a.name.localeCompare(b.name));
    const formatted = selected.map(formatEntryLine);
    if (endIndex < entries.length) {
        formatted.push(`More than ${cappedLimit} entries found`);
    }
    const outputLines = [`Absolute path: ${args.dirPath}`, ...formatted];
    return { output: outputLines.join("\n"), absolutePath: args.dirPath };
}
export async function runGrepFilesTool(rawArgs) {
    const args = await normalizeGrepArgs(rawArgs);
    const { stdout, stderr, code } = await executeRgCommand(args);
    if (code !== 0 && code !== 1) {
        const message = stderr.trim() || "rg failed to search for matches";
        throw new Error(message);
    }
    const matches = parseRgOutput(stdout, args.limit);
    if (matches.length === 0) {
        return {
            output: "No matches found.",
            searchPath: args.searchPath,
            success: false,
            exitCode: 1,
        };
    }
    return {
        output: matches.join("\n"),
        searchPath: args.searchPath,
        success: true,
        exitCode: 0,
    };
}
async function normalizeReadFileArgs(rawArgs) {
    const requestedPath = getString(rawArgs.file_path);
    if (!requestedPath) {
        throw new Error("file_path is required");
    }
    const filePath = await resolveFilePath(requestedPath);
    await assertIsFile(filePath);
    const offset = parsePositiveInt(rawArgs.offset, READ_FILE_DEFAULT_OFFSET, "offset must be a 1-indexed line number");
    const limit = parsePositiveInt(rawArgs.limit, READ_FILE_DEFAULT_LIMIT, "limit must be greater than zero");
    const rawMode = typeof rawArgs.mode === "string" ? rawArgs.mode.toLowerCase() : "slice";
    const mode = rawMode === "indentation" ? "indentation" : "slice";
    let indentation;
    if (mode === "indentation") {
        const rawIndent = typeof rawArgs.indentation === "object" && rawArgs.indentation
            ? rawArgs.indentation
            : {};
        const anchorLine = parsePositiveInt(rawIndent.anchor_line, offset, "anchor_line must be a 1-indexed line number");
        const maxLevels = parseNonNegativeInt(rawIndent.max_levels, 0);
        const includeSiblings = parseBoolean(rawIndent.include_siblings, false);
        const includeHeader = parseBoolean(rawIndent.include_header, true);
        const maxLines = rawIndent.max_lines === undefined
            ? undefined
            : parsePositiveInt(rawIndent.max_lines, READ_FILE_DEFAULT_LIMIT, "max_lines must be greater than zero");
        indentation = {
            anchorLine,
            maxLevels,
            includeSiblings,
            includeHeader,
            maxLines,
        };
    }
    return { filePath, offset, limit, mode, indentation };
}
async function normalizeGrepArgs(rawArgs) {
    const pattern = typeof rawArgs.pattern === "string" ? rawArgs.pattern.trim() : "";
    if (!pattern) {
        throw new Error("pattern must not be empty");
    }
    const include = typeof rawArgs.include === "string" && rawArgs.include.trim() !== ""
        ? rawArgs.include.trim()
        : undefined;
    const limit = Math.min(parsePositiveInt(rawArgs.limit, GREP_DEFAULT_LIMIT, "limit must be greater than zero"), GREP_MAX_LIMIT);
    const requestedPath = typeof rawArgs.path === "string" && rawArgs.path.trim() !== ""
        ? rawArgs.path.trim()
        : "";
    const searchPath = requestedPath
        ? path.isAbsolute(requestedPath)
            ? requestedPath
            : path.resolve(process.cwd(), requestedPath)
        : process.cwd();
    await assertPathExists(searchPath);
    return { pattern, include, searchPath, limit };
}
async function normalizeListDirArgs(rawArgs) {
    const requestedPath = getString(rawArgs.dir_path);
    if (!requestedPath) {
        throw new Error("dir_path is required");
    }
    const dirPath = resolveDirectoryPath(requestedPath);
    await assertIsDirectory(dirPath);
    const offset = parsePositiveInt(rawArgs.offset, LIST_DIR_DEFAULT_OFFSET, "offset must be a 1-indexed entry number");
    const limit = parsePositiveInt(rawArgs.limit, LIST_DIR_DEFAULT_LIMIT, "limit must be greater than zero");
    const depth = parsePositiveInt(rawArgs.depth, LIST_DIR_DEFAULT_DEPTH, "depth must be greater than zero");
    return { dirPath, offset, limit, depth };
}
async function resolveFilePath(requestedPath) {
    if (path.isAbsolute(requestedPath)) {
        return requestedPath;
    }
    return resolveWorkspaceFile(requestedPath);
}
function resolveDirectoryPath(requestedPath) {
    if (path.isAbsolute(requestedPath)) {
        return requestedPath;
    }
    return path.resolve(process.cwd(), requestedPath);
}
async function assertIsFile(filePath) {
    try {
        const stats = await fs.stat(filePath);
        if (!stats.isFile()) {
            throw new Error("file_path must refer to a regular file");
        }
    }
    catch (err) {
        if (err instanceof Error && err.message === "file_path must refer to a regular file") {
            throw err;
        }
        throw new Error(`failed to read file: ${err instanceof Error ? err.message : String(err)}`);
    }
}
async function assertIsDirectory(dirPath) {
    try {
        const stats = await fs.stat(dirPath);
        if (!stats.isDirectory()) {
            throw new Error("dir_path must refer to a directory");
        }
    }
    catch (err) {
        if (err instanceof Error && err.message === "dir_path must refer to a directory") {
            throw err;
        }
        throw new Error(`failed to read directory: ${err instanceof Error ? err.message : String(err)}`);
    }
}
function parsePositiveInt(value, fallback, errorMessage) {
    if (value === undefined) {
        return fallback;
    }
    const num = Number(value);
    if (!Number.isInteger(num) || num <= 0) {
        throw new Error(errorMessage);
    }
    return num;
}
function parseNonNegativeInt(value, fallback) {
    if (value === undefined) {
        return fallback;
    }
    const num = Number(value);
    if (!Number.isInteger(num) || num < 0) {
        throw new Error("max_levels must be zero or a positive integer");
    }
    return num;
}
function parseBoolean(value, fallback) {
    if (value === undefined) {
        return fallback;
    }
    if (typeof value === "boolean") {
        return value;
    }
    if (typeof value === "string") {
        if (value.toLowerCase() === "true") {
            return true;
        }
        if (value.toLowerCase() === "false") {
            return false;
        }
    }
    return fallback;
}
function getString(value) {
    return typeof value === "string" ? value.trim() : "";
}
async function assertPathExists(targetPath) {
    try {
        await fs.stat(targetPath);
    }
    catch (err) {
        throw new Error(`unable to access '${targetPath}': ${err instanceof Error ? err.message : String(err)}`);
    }
}
async function collectFileLines(filePath) {
    let data;
    try {
        data = await fs.readFile(filePath, "utf-8");
    }
    catch (err) {
        throw new Error(`failed to read file: ${err instanceof Error ? err.message : String(err)}`);
    }
    const rawLines = data.split(/\n/);
    const records = [];
    for (let index = 0; index < rawLines.length; index++) {
        let line = rawLines[index];
        if (line.endsWith("\r")) {
            line = line.slice(0, -1);
        }
        const number = index + 1;
        const display = truncateLine(line);
        const indent = measureIndent(line);
        records.push({ number, raw: line, display, indent });
    }
    return records;
}
function readSlice(records, args) {
    if (args.offset > records.length) {
        throw new Error("offset exceeds file length");
    }
    const startIndex = args.offset - 1;
    const cappedLimit = Math.min(args.limit, records.length - startIndex);
    const slice = records.slice(startIndex, startIndex + cappedLimit);
    return slice.map(formatRecordLine);
}
function readIndentationBlock(records, args) {
    const options = args.indentation ?? {
        anchorLine: args.offset,
        maxLevels: 0,
        includeSiblings: false,
        includeHeader: true,
    };
    const anchorLine = options.anchorLine ?? args.offset;
    if (anchorLine <= 0) {
        throw new Error("anchor_line must be a 1-indexed line number");
    }
    if (records.length === 0 || anchorLine > records.length) {
        throw new Error("anchor_line exceeds file length");
    }
    const guardLimit = options.maxLines ?? args.limit;
    if (guardLimit <= 0) {
        throw new Error("max_lines must be greater than zero");
    }
    const finalLimit = Math.min(args.limit, guardLimit, records.length);
    const anchorIndex = anchorLine - 1;
    const effectiveIndents = computeEffectiveIndents(records);
    const anchorIndent = effectiveIndents[anchorIndex];
    const minIndent = options.maxLevels === 0
        ? 0
        : Math.max(0, anchorIndent - options.maxLevels * TAB_WIDTH);
    if (finalLimit === 1) {
        return [formatRecordLine(records[anchorIndex])];
    }
    const includeSiblings = options.includeSiblings ?? false;
    const includeHeader = options.includeHeader ?? true;
    const deque = [records[anchorIndex]];
    let i = anchorIndex - 1;
    let j = anchorIndex + 1;
    let iCounter = 0;
    let jCounter = 0;
    while (deque.length < finalLimit) {
        let progressed = 0;
        if (i >= 0) {
            const indent = effectiveIndents[i];
            if (indent >= minIndent) {
                const record = records[i];
                deque.unshift(record);
                progressed += 1;
                i -= 1;
                if (indent === minIndent && !includeSiblings) {
                    const allowHeader = includeHeader && isComment(record.raw);
                    const canTakeLine = allowHeader || iCounter === 0;
                    if (canTakeLine) {
                        iCounter += 1;
                    }
                    else {
                        deque.shift();
                        progressed -= 1;
                        i = -1;
                    }
                }
                if (deque.length >= finalLimit) {
                    break;
                }
            }
            else {
                i = -1;
            }
        }
        if (deque.length >= finalLimit) {
            break;
        }
        if (j < records.length) {
            const indent = effectiveIndents[j];
            if (indent >= minIndent) {
                const record = records[j];
                deque.push(record);
                progressed += 1;
                j += 1;
                if (indent === minIndent && !includeSiblings) {
                    if (jCounter > 0) {
                        deque.pop();
                        progressed -= 1;
                        j = records.length;
                    }
                    jCounter += 1;
                }
            }
            else {
                j = records.length;
            }
        }
        if (progressed === 0) {
            break;
        }
    }
    trimEmptyEdges(deque);
    if (deque.length > finalLimit) {
        deque.splice(finalLimit);
    }
    return deque.map(formatRecordLine);
}
function formatRecordLine(record) {
    return `L${record.number}: ${record.display}`;
}
function parseRgOutput(stdout, limit) {
    const matches = [];
    for (const line of stdout.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed) {
            continue;
        }
        matches.push(trimmed);
        if (matches.length >= limit) {
            break;
        }
    }
    return matches;
}
function computeEffectiveIndents(records) {
    const effective = [];
    let previous = 0;
    for (const record of records) {
        if (record.raw.trim() === "") {
            effective.push(previous);
        }
        else {
            previous = record.indent;
            effective.push(previous);
        }
    }
    return effective;
}
function measureIndent(line) {
    let indent = 0;
    for (const ch of line) {
        if (ch === " ") {
            indent += 1;
        }
        else if (ch === "\t") {
            indent += TAB_WIDTH;
        }
        else {
            break;
        }
    }
    return indent;
}
async function executeRgCommand(args) {
    const rgArgs = [
        "--files-with-matches",
        "--sortr=modified",
        "--regexp",
        args.pattern,
        "--no-messages",
    ];
    if (args.include) {
        rgArgs.push("--glob", args.include);
    }
    rgArgs.push("--", args.searchPath);
    return await new Promise((resolve, reject) => {
        const child = spawn("rg", rgArgs, {
            cwd: process.cwd(),
        });
        let stdout = "";
        let stderr = "";
        const timer = setTimeout(() => {
            child.kill();
            reject(new Error("rg timed out after 30 seconds"));
        }, RG_TIMEOUT_MS);
        child.stdout.on("data", (chunk) => {
            stdout += chunk.toString();
        });
        child.stderr.on("data", (chunk) => {
            stderr += chunk.toString();
        });
        child.on("error", (error) => {
            clearTimeout(timer);
            reject(new Error(`failed to launch rg: ${error instanceof Error ? error.message : String(error)}. Ensure ripgrep is installed and on PATH.`));
        });
        child.on("close", (code) => {
            clearTimeout(timer);
            resolve({ stdout, stderr, code: code ?? 1 });
        });
    });
}
function truncateLine(line) {
    if (line.length <= MAX_LINE_LENGTH) {
        return line;
    }
    return [...line].slice(0, MAX_LINE_LENGTH).join("");
}
function trimEmptyEdges(records) {
    while (records.length > 0 && records[0].raw.trim() === "") {
        records.shift();
    }
    while (records.length > 0 && records[records.length - 1].raw.trim() === "") {
        records.pop();
    }
}
function isComment(line) {
    const trimmed = line.trimStart();
    return COMMENT_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
}
async function collectEntries(dirPath, depth) {
    const entries = [];
    const queue = [
        { abs: dirPath, rel: "", depth },
    ];
    while (queue.length > 0) {
        const { abs, rel, depth: remainingDepth } = queue.shift();
        let dirEntries;
        try {
            dirEntries = await fs.readdir(abs, { withFileTypes: true });
        }
        catch (err) {
            throw new Error(`failed to read directory: ${err instanceof Error ? err.message : String(err)}`);
        }
        dirEntries.sort((a, b) => a.name.localeCompare(b.name));
        for (const dirent of dirEntries) {
            const relative = rel ? path.join(rel, dirent.name) : dirent.name;
            const name = normalizePath(relative);
            const displayName = formatEntryComponent(dirent.name);
            const displayDepth = rel === "" ? 0 : rel.split(path.sep).filter(Boolean).length;
            const kind = classifyDirent(dirent);
            entries.push({
                name,
                displayName,
                depth: displayDepth,
                kind,
            });
            if (dirent.isDirectory() && remainingDepth > 1) {
                queue.push({
                    abs: path.join(abs, dirent.name),
                    rel: relative,
                    depth: remainingDepth - 1,
                });
            }
        }
    }
    return entries;
}
function normalizePath(p) {
    return p.replace(/\\/g, "/");
}
function classifyDirent(dirent) {
    if (dirent.isSymbolicLink()) {
        return "symlink";
    }
    if (dirent.isDirectory()) {
        return "directory";
    }
    if (dirent.isFile()) {
        return "file";
    }
    return "other";
}
function formatEntryComponent(name) {
    if (name.length <= MAX_LINE_LENGTH) {
        return name;
    }
    return [...name].slice(0, MAX_LINE_LENGTH).join("");
}
function formatEntryLine(entry) {
    const indent = " ".repeat(entry.depth * INDENTATION_SPACES);
    let display = entry.displayName;
    if (entry.kind === "directory") {
        display += "/";
    }
    else if (entry.kind === "symlink") {
        display += "@";
    }
    else if (entry.kind === "other") {
        display += "?";
    }
    return `${indent}${display}`;
}
