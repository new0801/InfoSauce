const DATA_API_URL =
    process.env.DATA_API_URL || "http://localhost:3001";


// Retrieve external research from the Data service.
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

    const url =
        `${DATA_API_URL}/api/news?query=` +
        encodeURIComponent(claim.trim());

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `evidence.js: Data service failed with status ${response.status}`
        );
    }

    const data = await response.json();

    if (
        !data ||
        !Array.isArray(data.news)
    ) {
        throw new Error(
            "evidence.js: Data service returned an invalid research response"
        );
    }

    const articles = data.news;

    const sources = articles
        .map(article => article.url)
        .filter(
            url =>
                typeof url === "string" &&
                url.trim() !== ""
        );

    const evidence = articles.map(article => ({
        title: article.title,
        content: article.content,
        source: article.source,
        url: article.url,
        publishedAt: article.publishedAt || null,
        platform: article.platform || null
    }));

    return {
        sources,
        evidence,
        articles
    };
}


module.exports = {
    retrieveEvidence
};