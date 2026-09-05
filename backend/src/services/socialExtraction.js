const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);
const COMMAND_TIMEOUT_MS = 15_000;

class SocialExtractionError extends Error {
    constructor(code, message, platform = null) {
        super(message);
        this.name = "SocialExtractionError";
        this.code = code;
        this.platform = platform;
    }
}

function socialUrl(value) {
    let url;
    try {
        url = new URL(value);
    } catch {
        throw new SocialExtractionError("SOCIAL_URL_INVALID", "The submitted social URL is invalid.");
    }
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) {
        throw new SocialExtractionError("SOCIAL_URL_INVALID", "The submitted social URL is invalid.");
    }
    return url;
}

function detectSocialUrl(value) {
    const url = socialUrl(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const parts = url.pathname.split("/").filter(Boolean);

    if (host === "x.com" || host === "twitter.com") {
        const statusId = parts.length >= 3 && parts[1] === "status" ? parts[2] : null;
        if (!statusId || !/^\d+$/.test(statusId)) {
            throw new SocialExtractionError("SOCIAL_URL_INVALID", "The submitted X post URL is invalid.", "x");
        }
        return { platform: "x", id: statusId };
    }

    if (host === "reddit.com" || host.endsWith(".reddit.com")) {
        const postId = parts[0] === "r" && parts[2] === "comments" ? parts[3] : null;
        if (!postId || !/^[a-z0-9]+$/i.test(postId) || parts.length > 5) {
            throw new SocialExtractionError("SOCIAL_URL_INVALID", "The submitted Reddit post URL is invalid.", "reddit");
        }
        return { platform: "reddit", id: postId };
    }

    return null;
}

function recordsFrom(value, depth = 0) {
    if (depth > 5 || value === null || value === undefined) return [];
    if (Array.isArray(value)) return value.flatMap(item => recordsFrom(item, depth + 1));
    if (typeof value !== "object") return [];
    return [value, ...Object.values(value).flatMap(item => recordsFrom(item, depth + 1))];
}

function stringValue(value) {
    return typeof value === "string" ? value.trim() : "";
}

function canonicalRedditUrl(permalink, fallback) {
    if (typeof permalink !== "string" || !permalink.trim()) return fallback;
    try {
        return new URL(permalink, "https://www.reddit.com").toString();
    } catch {
        return fallback;
    }
}

function parseJson(stdout, platform) {
    try {
        return JSON.parse(stdout);
    } catch {
        throw new SocialExtractionError("SOCIAL_UNAVAILABLE", "The submitted post could not be retrieved.", platform);
    }
}

function extractXPost(value, id, output) {
    const record = recordsFrom(parseJson(output, "x")).find(item => stringValue(item.id) === id);
    const text = stringValue(record?.text);
    if (!record || !text) throw new SocialExtractionError("SOCIAL_UNAVAILABLE", "The submitted X post could not be retrieved.", "x");
    const author = stringValue(record.author) || undefined;
    const url = stringValue(record.url) || `https://x.com/i/status/${id}`;
    return {
        platform: "x",
        originalUrl: value.trim(),
        resolvedUrl: url,
        title: text,
        content: text,
        ...(author ? { author, source: `${author} on X` } : { source: "X" }),
        ...(stringValue(record.created_at) ? { publishedAt: stringValue(record.created_at) } : {})
    };
}

function extractRedditPost(value, id, output) {
    const records = recordsFrom(parseJson(output, "reddit"));
    const record = records.find(item =>
        stringValue(item.id).replace(/^t3_/i, "") === id &&
        (stringValue(item.type).toLowerCase() === "post" || Boolean(stringValue(item.title)))
    ) || records.find(item => stringValue(item.type).toUpperCase() === "POST");
    const combinedText = stringValue(record?.text);
    const title = stringValue(record?.title) || combinedText.split(/\n\s*\n/)[0].trim();
    if (!record || !title) throw new SocialExtractionError("SOCIAL_UNAVAILABLE", "The submitted Reddit post could not be retrieved.", "reddit");
    const body = stringValue(record.selftext) || stringValue(record.body);
    const author = stringValue(record.author) || undefined;
    const subreddit = stringValue(record.subreddit);
    const source = [subreddit ? `r/${subreddit.replace(/^r\//i, "")}` : "Reddit", author ? `u/${author}` : ""].filter(Boolean).join(" · ");
    const createdAt = typeof record.created_utc === "number" && Number.isFinite(record.created_utc)
        ? new Date(record.created_utc * 1000).toISOString()
        : stringValue(record.created_at) || undefined;
    return {
        platform: "reddit",
        originalUrl: value.trim(),
        resolvedUrl: canonicalRedditUrl(record.permalink || record.url, value.trim()),
        title,
        content: body ? `${title}\n\n${body}` : combinedText || title,
        source,
        ...(author ? { author } : {}),
        ...(createdAt ? { publishedAt: createdAt } : {})
    };
}

function encodedPowerShellCommand(args) {
    const payload = Buffer.from(JSON.stringify(args), "utf8").toString("base64");
    const script = [
        `$args = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${payload}')) | ConvertFrom-Json`,
        "$command = (Get-Command 'opencli.cmd' -ErrorAction Stop).Source",
        "& $command @($args)"
    ].join("; ");
    return Buffer.from(script, "utf16le").toString("base64");
}

async function runOpenCli(command, args) {
    if (process.platform === "win32") {
        const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-EncodedCommand", encodedPowerShellCommand([command, ...args])], { timeout: COMMAND_TIMEOUT_MS, maxBuffer: 2 * 1024 * 1024 });
        return stdout;
    }
    const { stdout } = await execFileAsync("opencli", [command, ...args], { timeout: COMMAND_TIMEOUT_MS, maxBuffer: 2 * 1024 * 1024 });
    return stdout;
}

async function extractSocialPost(value, dependencies = {}) {
    const target = detectSocialUrl(value);
    if (!target) return null;
    const runner = dependencies.runOpenCli || runOpenCli;
    const args = target.platform === "x"
        ? ["thread", target.id, "-f", "json"]
        : ["read", target.id, "-f", "json"];
    let output;
    try {
        output = await runner(target.platform === "x" ? "twitter" : "reddit", args);
    } catch {
        throw new SocialExtractionError("SOCIAL_UNAVAILABLE", "The submitted post could not be retrieved.", target.platform);
    }
    return target.platform === "x"
        ? extractXPost(value, target.id, output)
        : extractRedditPost(value, target.id, output);
}

module.exports = { SocialExtractionError, detectSocialUrl, extractSocialPost, runOpenCli };
