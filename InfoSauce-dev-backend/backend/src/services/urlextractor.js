const MAX_TEXT_LENGTH =
    30000;
const { JSDOM } = require("jsdom");
const { Readability } = require("@mozilla/readability");


/*
 * ==========================================
 * MAIN URL EXTRACTOR
 * ==========================================
 */

async function extractUrlContent(
    inputUrl
) {

    /*
     * Validate the submitted URL.
     */

    if (
        !inputUrl ||
        typeof inputUrl !== "string" ||
        inputUrl.trim() === ""
    ) {
        throw new Error(
            "urlExtractor.js: URL must be a non-empty string"
        );
    }


    let url;

    try {

        url =
            new URL(
                inputUrl.trim()
            );

    } catch {

        throw new Error(
            "urlExtractor.js: Invalid URL"
        );
    }


    /*
     * Only allow HTTP and HTTPS.
     */

    if (
        url.protocol !== "http:" &&
        url.protocol !== "https:"
    ) {

        throw new Error(
            "urlExtractor.js: Only HTTP and HTTPS URLs are supported"
        );
    }


    /*
     * Identify the platform.
     */

    const platform =
        detectPlatform(
            url
        );


    /*
     * For now, Reddit has the dedicated
     * Data-service implementation.
     */

    if (
        platform === "reddit"
    ) {

        return await extractReddit(
            url
        );
    }


    return extractWebPage(url, platform || "web");
}


/*
 * ==========================================
 * PLATFORM DETECTION
 * ==========================================
 */

function detectPlatform(
    url
) {

    const hostname =
        url.hostname
            .toLowerCase()
            .replace(
                /^www\./,
                ""
            );


    /*
     * Reddit
     */

    if (
        hostname === "reddit.com" ||
        hostname.endsWith(".reddit.com")
    ) {

        return "reddit";
    }


    /*
     * Twitter / X
     */

    if (
        hostname === "twitter.com" ||
        hostname.endsWith(".twitter.com") ||
        hostname === "x.com" ||
        hostname.endsWith(".x.com")
    ) {

        return "twitter";
    }


    /*
     * YouTube
     */

    if (
        hostname === "youtube.com" ||
        hostname.endsWith(".youtube.com") ||
        hostname === "youtu.be"
    ) {

        return "youtube";
    }


    /*
     * Bilibili
     */

    if (
        hostname === "bilibili.com" ||
        hostname.endsWith(".bilibili.com")
    ) {

        return "bilibili";
    }


    /*
     * Xiaohongshu
     */

    if (
        hostname === "xiaohongshu.com" ||
        hostname.endsWith(".xiaohongshu.com") ||
        hostname === "xhslink.com" ||
        hostname.endsWith(".xhslink.com")
    ) {

        return "xiaohongshu";
    }

    if (
        hostname === "instagram.com" ||
        hostname.endsWith(".instagram.com") ||
        hostname === "facebook.com" ||
        hostname.endsWith(".facebook.com") ||
        hostname === "tiktok.com" ||
        hostname.endsWith(".tiktok.com")
    ) {
        return "social";
    }


    return null;
}


/*
 * ==========================================
 * REDDIT EXTRACTOR
 * ==========================================
 */

async function extractReddit(
    url
) {

    /*
     * A permalink should be resolved from Reddit first. Searching the
     * data service is useful as a fallback, but it cannot guarantee that
     * an older or low-ranking post appears in its result set.
     */
    const directPost =
        await extractRedditJsonPost(url);

    if (directPost) {
        return directPost;
    }

    /*
     * Reddit may deny its JSON endpoint but still serve the public post
     * page. Readability gives Sauce Verify a usable fallback without
     * depending on whether search happened to index that permalink.
     */
    try {
        return await extractWebPage(url, "reddit");
    } catch {
        // Keep the data-service lookup below as the final fallback.
    }

    const DATA_API_URL =
        process.env.DATA_API_URL ||
        "http://localhost:3001";


    /*
     * Ask the existing Data service to find
     * this Reddit post.
     */

    const pathParts =
        url.pathname.split("/").filter(Boolean);
    const commentsIndex =
        pathParts.findIndex(part => part.toLowerCase() === "comments");
    const postId =
        commentsIndex >= 0
            ? pathParts[commentsIndex + 1] || ""
            : "";
    const titleSlug =
        commentsIndex >= 0
            ? pathParts.slice(commentsIndex + 2).join(" ").replace(/[-_]+/g, " ")
            : "";
    const searchQuery =
        titleSlug || postId || url.toString();

    const apiUrl =
        `${DATA_API_URL}/api/news?query=` +
        encodeURIComponent(
            searchQuery
        );


    let response;

    try {

        response =
            await fetch(
                apiUrl
            );

    } catch {

        throw new Error(
            "urlExtractor.js: Could not connect to Data service for Reddit extraction"
        );
    }


    if (
        !response.ok
    ) {

        throw new Error(
            `urlExtractor.js: Data service returned status ${response.status} while extracting Reddit post`
        );
    }


    let data;

    try {

        data =
            await response.json();

    } catch {

        throw new Error(
            "urlExtractor.js: Data service returned invalid JSON for Reddit extraction"
        );
    }


    if (
        !data ||
        !Array.isArray(data.news)
    ) {

        throw new Error(
            "urlExtractor.js: Data service returned no usable Reddit results"
        );
    }


    /*
     * Normalize the submitted URL so that
     * harmless differences such as trailing /
     * or query parameters do not prevent matching.
     */

    const submittedUrl =
        normalizeRedditUrl(
            url.toString()
        );


    /*
     * Find the exact Reddit post.
     */

    const redditPost =
        data.news.find(
            item => {

                if (
                    !item ||
                    typeof item.url !==
                        "string"
                ) {

                    return false;
                }


                return (
                    normalizeRedditUrl(
                        item.url
                    ) ===
                    submittedUrl ||
                    (
                        postId !== "" &&
                        (
                            item.id === postId ||
                            item.url.includes(`/comments/${postId}/`)
                        )
                    )
                );
            }
        );


    if (
        !redditPost
    ) {
        /*
         * The permalink title is still reliable post content when Reddit
         * blocks server-side fetches and the research provider has not
         * indexed the post yet. This lets claim extraction decide whether
         * that title contains a fact, rather than failing the request.
         */
        const fallbackTitle =
            titleSlug
                ? decodeURIComponent(titleSlug)
                    .replace(/[-_]+/g, " ")
                    .replace(/\s+/g, " ")
                    .trim()
                : "Reddit Post";

        return {
            url: url.toString(),
            platform: "reddit",
            title: fallbackTitle,
            content: cleanAndLimitText(fallbackTitle),
            excerpt: "",
            byline: "",
            siteName: "Reddit",
            publishedTime: null
        };
    }


    const title =
        typeof redditPost.title ===
            "string"
            ? redditPost.title.trim()
            : "";


    const content =
        typeof redditPost.content ===
            "string"
            ? redditPost.content.trim()
            : "";


    if (
        title === "" &&
        content === ""
    ) {

        throw new Error(
            "urlExtractor.js: Reddit post contains no usable text"
        );
    }


    /*
     * Combine the title and body.
     */

    const combinedContent =
        cleanAndLimitText(
            [
                title,
                content
            ]
                .filter(
                    value =>
                        value !== ""
                )
                .join("\n\n")
        );


    return {

        url:
            redditPost.url ||
            url.toString(),

        platform:
            "reddit",

        title:
            title ||
            "Reddit Post",

        content:
            combinedContent,

        excerpt:
            content,

        byline:
            "",

        siteName:
            "Reddit",

        publishedTime:
            redditPost.publishedAt ||
            null
    };
}


/*
 * ==========================================
 * REDDIT URL NORMALIZATION
 * ==========================================
 */

function normalizeRedditUrl(
    inputUrl
) {

    try {

        const url =
            new URL(
                inputUrl
            );


        /*
         * Remove tracking/query parameters.
         */

        url.search = "";
        url.hash = "";


        /*
         * Remove trailing slash.
         */

        let pathname =
            url.pathname.replace(
                /\/+$/,
                ""
            );


        /*
         * Normalize old-style Reddit
         * post URLs.
         *
         * Example:
         *
         * /r/test/comments/abc123/title
         *
         * remains:
         *
         * /r/test/comments/abc123/title
         */

        const commentsMatch =
            pathname.match(
                /^(\/r\/[^/]+\/comments\/[^/]+(?:\/[^/]+)?)/i
            );


        if (
            commentsMatch
        ) {

            pathname =
                commentsMatch[1];
        }


        return (
            url.hostname
                .toLowerCase()
                .replace(
                    /^www\./,
                    ""
                ) +
            pathname
        );

    } catch {

        return String(
            inputUrl
        )
            .trim()
            .toLowerCase()
            .replace(
                /\/+$/,
                ""
            );
    }
}

async function extractRedditJsonPost(url) {
    const jsonUrl = new URL(url.toString());
    jsonUrl.search = "raw_json=1";
    jsonUrl.hash = "";

    if (!jsonUrl.pathname.endsWith(".json")) {
        jsonUrl.pathname = `${jsonUrl.pathname.replace(/\/$/, "")}.json`;
    }

    let response;

    try {
        response = await fetch(jsonUrl, {
            headers: {
                "User-Agent": "InfoSauce/1.0 (fact-checking research bot)"
            }
        });
    } catch {
        return null;
    }

    if (!response.ok) {
        return null;
    }

    let payload;

    try {
        payload = await response.json();
    } catch {
        return null;
    }

    const post = payload?.[0]?.data?.children?.[0]?.data;

    if (!post || typeof post !== "object") {
        return null;
    }

    const title = typeof post.title === "string" ? post.title.trim() : "";
    const body = typeof post.selftext === "string" ? post.selftext.trim() : "";
    const content = cleanAndLimitText([title, body].filter(Boolean).join("\n\n"));

    if (!content) {
        return null;
    }

    return {
        url: post.permalink
            ? `https://www.reddit.com${post.permalink}`
            : url.toString(),
        platform: "reddit",
        title: title || "Reddit Post",
        content,
        excerpt: body,
        byline: typeof post.author === "string" ? `u/${post.author}` : "",
        siteName: "Reddit",
        publishedTime: typeof post.created_utc === "number"
            ? new Date(post.created_utc * 1000).toISOString()
            : null
    };
}

async function extractWebPage(url, platform) {
    let response;

    try {
        response = await fetch(url, {
            headers: {
                "User-Agent": "InfoSauce/1.0 (fact-checking research bot)"
            }
        });
    } catch {
        throw new Error("urlExtractor.js: Could not fetch the submitted URL");
    }

    if (!response.ok) {
        throw new Error(`urlExtractor.js: Submitted URL returned status ${response.status}`);
    }

    const html = await response.text();
    const dom = new JSDOM(html, { url: url.toString() });
    const article = new Readability(dom.window.document).parse();
    const content = cleanAndLimitText(
        article?.textContent || dom.window.document.body?.textContent || ""
    );

    if (!content) {
        throw new Error("urlExtractor.js: No readable text was found at the submitted URL");
    }

    return {
        url: url.toString(),
        platform,
        title: article?.title || dom.window.document.title || "Submitted post",
        content,
        excerpt: article?.excerpt || "",
        byline: article?.byline || "",
        siteName: url.hostname,
        publishedTime: null
    };
}


/*
 * ==========================================
 * TEXT CLEANING
 * ==========================================
 */

function cleanAndLimitText(
    text
) {

    if (
        typeof text !==
            "string"
    ) {

        return "";
    }


    const clean =
        text
            .replace(
                /\s+/g,
                " "
            )
            .trim();


    if (
        clean.length <=
            MAX_TEXT_LENGTH
    ) {

        return clean;
    }


    return clean
        .slice(
            0,
            MAX_TEXT_LENGTH
        )
        .trim();
}


/*
 * ==========================================
 * EXPORTS
 * ==========================================
 */

module.exports = {
    extractUrlContent,
    detectPlatform
};
