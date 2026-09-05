function queryTokens(query) {
    return String(query || "")
        .toLowerCase()
        .match(/[a-z0-9][a-z0-9-]*/g)
        ?.filter(token => token.length >= 3) || [];
}

function countMatches(text, tokens) {
    const normalized = String(text || "").toLowerCase();
    return tokens.reduce(
        (count, token) => count + (normalized.includes(token) ? 1 : 0),
        0
    );
}

function recencyScore(publishedAt) {
    const published = Date.parse(publishedAt || "");
    if (!Number.isFinite(published)) return 0;

    const ageDays = Math.max(0, (Date.now() - published) / 86_400_000);
    if (ageDays <= 3) return 3;
    if (ageDays <= 30) return 2;
    if (ageDays <= 180) return 1;
    return 0;
}

function usefulnessScore(article, query) {
    const title = String(article.title || "");
    const content = String(article.content || "");
    const tokens = queryTokens(query);
    const titleMatches = countMatches(title, tokens);
    const contentMatches = countMatches(content, tokens);
    const specificity = /\b\d+(?:\.\d+)?(?:%|\b)|\b20\d{2}\b/.test(`${title} ${content}`) ? 4 : 0;
    const claimSignal = /\b(announced|confirmed|published|released|reported|measured|found|according)\b/i.test(`${title} ${content}`) ? 4 : 0;
    const sourceQuality = article.sourceType === "news" ? 3 : 1;
    const information = Math.min(content.trim().length / 160, 5);

    return titleMatches * 8
        + contentMatches * 2
        + specificity
        + claimSignal
        + sourceQuality
        + information
        + recencyScore(article.publishedAt);
}

function selectMostUsefulPerPlatform(articles, query) {
    const bestByPlatform = new Map();

    for (const article of articles) {
        if (!article || typeof article.platform !== "string") continue;

        const score = usefulnessScore(article, query);
        const current = bestByPlatform.get(article.platform);

        if (!current || score > current.score) {
            bestByPlatform.set(article.platform, { article, score });
        }
    }

    return [...bestByPlatform.values()].map(entry => entry.article);
}

module.exports = {
    selectMostUsefulPerPlatform,
    usefulnessScore
};
