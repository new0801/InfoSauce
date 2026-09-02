// Search Google News for external candidate evidence.
async function searchGoogleNews(claim) {

    const url =
        "https://news.google.com/rss/search?" +
        new URLSearchParams({
            q: claim,
            hl: "en-US",
            gl: "US",
            ceid: "US:en"
        });

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `evidence.js: Google News search failed: ${response.status}`
        );
    }

    const xml = await response.text();

    return xml;
}


// Extract text from an XML tag.
function extractTag(item, tagName) {

    const regex = new RegExp(
        `<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`,
        "i"
    );

    const match = item.match(regex);

    return match ? match[1].trim() : "";
}


// Decode basic XML entities.
function decodeXml(text) {

    return text
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}


// Parse Google News RSS results.
function parseGoogleNews(xml) {

    const items = xml.match(
        /<item>[\s\S]*?<\/item>/gi
    ) || [];

    const articles = [];

    for (const item of items) {

        const title = decodeXml(
            extractTag(item, "title")
        );

        const link = decodeXml(
            extractTag(item, "link")
        );

        const pubDate = decodeXml(
            extractTag(item, "pubDate")
        );

        const sourceMatch = item.match(
            /<source[^>]*url="([^"]*)"[^>]*>([\s\S]*?)<\/source>/i
        );

        const sourceUrl = sourceMatch
            ? decodeXml(sourceMatch[1])
            : "";

        const sourceName = sourceMatch
            ? decodeXml(sourceMatch[2].trim())
            : "";

        if (!title || !link) {
            continue;
        }

        articles.push({
            title,
            url: link,
            publishedAt: pubDate || null,
            source: {
                name: sourceName || "Unknown",
                url: sourceUrl || null
            }
        });
    }

    return articles;
}


// Retrieve external candidate evidence.
async function retrieveEvidence(claim) {

    if (
        !claim ||
        typeof claim !== "string" ||
        claim.trim() === ""
    ) {
        throw new Error(
            "evidence.js: Claim must be a non-empty string"
        );
    }

    // 1. Search Google News
    const xml = await searchGoogleNews(
        claim.trim()
    );

    // 2. Parse search results
    const articles = parseGoogleNews(xml);

    // 3. Build sources
    const sources = articles.map(
        article => article.url
    );

    // 4. Build candidate evidence
    const evidence = articles.map(
        article => {

            return (
                `Article: ${article.title}\n` +
                `Source: ${article.source.name}\n` +
                `Published: ${article.publishedAt || "Unknown"}\n` +
                `URL: ${article.url}`
            );
        }
    );

    // 5. Return structured evidence
    return {
        sources,
        evidence,
        articles
    };
}

module.exports = {
    retrieveEvidence
};