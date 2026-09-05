const { lookup: dnsLookup } = require("node:dns/promises");

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 1_048_576;
const MAX_EXTRACTED_CHARS = 30_000;
const MAX_REDIRECTS = 3;

class ContentExtractionError extends Error {
    constructor(code, message) {
        super(message);
        this.name = "ContentExtractionError";
        this.code = code;
    }
}

function hostWithoutBrackets(hostname) {
    return hostname.replace(/^\[|\]$/g, "").toLowerCase();
}

function isBlockedIpv4(address) {
    const parts = address.split(".").map(Number);
    if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return false;
    const [a, b] = parts;
    return a === 0 || a === 10 || a === 127 || a >= 224 ||
        (a === 100 && b >= 64 && b <= 127) ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        (a === 198 && (b === 18 || b === 19));
}

function isBlockedIp(address) {
    const normalized = hostWithoutBrackets(address);
    if (isBlockedIpv4(normalized)) return true;
    const lower = normalized.toLowerCase();
    return lower === "::" || lower === "::1" ||
        lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe8") ||
        lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb") ||
        lower.startsWith("::ffff:127.") || lower.startsWith("::ffff:10.") ||
        lower.startsWith("::ffff:192.168.") || lower.startsWith("::ffff:169.254.");
}

function parsePublicUrl(value) {
    let url;
    try {
        url = new URL(value);
    } catch {
        throw new ContentExtractionError("URL_INVALID", "The submitted URL is invalid.");
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new ContentExtractionError("URL_INVALID", "Only HTTP and HTTPS URLs are supported.");
    }
    if (url.username || url.password) {
        throw new ContentExtractionError("URL_CREDENTIALS", "URLs with embedded credentials are not supported.");
    }
    return url;
}

async function assertPublicTarget(url, lookup) {
    const hostname = hostWithoutBrackets(url.hostname);
    if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") || isBlockedIp(hostname)) {
        throw new ContentExtractionError("URL_BLOCKED", "This URL does not point to a public host.");
    }

    let addresses;
    try {
        addresses = await lookup(hostname, { all: true, verbatim: true });
    } catch {
        throw new ContentExtractionError("URL_DNS_FAILED", "The URL host could not be resolved.");
    }

    if (!Array.isArray(addresses) || addresses.length === 0 || addresses.some(record => isBlockedIp(String(record.address || "")))) {
        throw new ContentExtractionError("URL_BLOCKED", "This URL does not point to a public host.");
    }
}

async function readBoundedText(response, maxBytes) {
    if (!response.body || typeof response.body.getReader !== "function") {
        const text = await response.text();
        if (Buffer.byteLength(text, "utf8") > maxBytes) {
            throw new ContentExtractionError("URL_TOO_LARGE", "The page response is too large.");
        }
        return text;
    }

    const reader = response.body.getReader();
    const chunks = [];
    let total = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            total += value.byteLength;
            if (total > maxBytes) {
                await reader.cancel();
                throw new ContentExtractionError("URL_TOO_LARGE", "The page response is too large.");
            }
            chunks.push(Buffer.from(value));
        }
    } finally {
        reader.releaseLock();
    }
    return Buffer.concat(chunks).toString("utf8");
}

function decodeHtml(text) {
    return text
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">");
}

function htmlToText(html) {
    const main = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1] ||
        html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ||
        html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] || html;
    return decodeHtml(main
        .replace(/<!--[\s\S]*?-->/g, " ")
        .replace(/<(script|style|noscript|nav|header|footer|aside|form|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim())
        .slice(0, MAX_EXTRACTED_CHARS);
}

function pageTitle(html) {
    const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "";
    return decodeHtml(title.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()).slice(0, 500) || null;
}

async function extractPublicPage(submittedUrl, dependencies = {}) {
    const fetchImpl = dependencies.fetch || global.fetch;
    const lookup = dependencies.lookup || dnsLookup;
    let url = parsePublicUrl(submittedUrl);
    const originalUrl = typeof submittedUrl === "string" ? submittedUrl.trim() : url.toString();

    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
        await assertPublicTarget(url, lookup);
        let response;
        try {
            response = await fetchImpl(url, {
                method: "GET",
                redirect: "manual",
                signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
                headers: { "User-Agent": "InfoSauce-Verify/1.0", "Accept": "text/html,application/xhtml+xml" }
            });
        } catch (error) {
            if (error?.name === "TimeoutError" || /timeout|aborted/i.test(String(error?.message || ""))) {
                throw new ContentExtractionError("URL_TIMEOUT", "The page request timed out.");
            }
            throw new ContentExtractionError("URL_FETCH_FAILED", "The page could not be fetched.");
        }

        if ([301, 302, 303, 307, 308].includes(response.status)) {
            const location = response.headers.get("location");
            if (!location || redirects === MAX_REDIRECTS) {
                throw new ContentExtractionError("URL_REDIRECT_FAILED", "The page redirect could not be followed.");
            }
            url = parsePublicUrl(new URL(location, url).toString());
            continue;
        }
        if (!response.ok) {
            throw new ContentExtractionError("URL_FETCH_FAILED", "The page could not be fetched.");
        }

        const contentType = response.headers.get("content-type") || "";
        if (!/^text\/html(?:\s*;|$)|^application\/xhtml\+xml(?:\s*;|$)/i.test(contentType)) {
            throw new ContentExtractionError("URL_NON_HTML", "The submitted URL does not contain an HTML page.");
        }
        const contentLength = Number(response.headers.get("content-length"));
        if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
            throw new ContentExtractionError("URL_TOO_LARGE", "The page response is too large.");
        }

        let html;
        try {
            html = await readBoundedText(response, MAX_RESPONSE_BYTES);
        } catch (error) {
            if (error instanceof ContentExtractionError) throw error;
            if (error?.name === "TimeoutError" || /timeout|aborted/i.test(String(error?.message || ""))) {
                throw new ContentExtractionError("URL_TIMEOUT", "The page request timed out.");
            }
            throw new ContentExtractionError("URL_FETCH_FAILED", "The page response could not be read.");
        }
        const content = htmlToText(html);
        if (content.length < 40) {
            throw new ContentExtractionError("URL_INSUFFICIENT_CONTENT", "The page did not contain enough readable text.");
        }
        return { originalUrl, resolvedUrl: url.toString(), title: pageTitle(html), content };
    }

    throw new ContentExtractionError("URL_REDIRECT_FAILED", "The page redirect could not be followed.");
}

module.exports = { ContentExtractionError, extractPublicPage };
