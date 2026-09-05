const DATA_API_URL =
    process.env.DATA_API_URL || "http://localhost:3001";
const EVIDENCE_REQUEST_TIMEOUT_MS = 20_000;

function claimTokens(claim) {
    return claim.toLowerCase().match(/[a-z0-9][a-z0-9-]*/g)
        ?.filter(token => token.length >= 3) || [];
}

function isRelevantEvidence(article, tokens) {
    const text = `${article.title || ""} ${article.content || ""}`.toLowerCase();
    const title = String(article.title || "").toLowerCase();
    const matches = tokens.filter(token => text.includes(token));
    return matches.length >= Math.min(3, tokens.length) && matches.some(token => title.includes(token));
}

function normalizedUrl(value) {
    if (typeof value !== "string" || value.trim() === "") return null;

    try {
        const parsed = new URL(value);
        parsed.hash = "";
        parsed.hostname = parsed.hostname.toLowerCase();
        parsed.pathname = parsed.pathname.replace(/\/+$/, "") || "/";
        [...parsed.searchParams.keys()]
            .filter(key => /^utm_/i.test(key) || /^(fbclid|gclid)$/i.test(key))
            .forEach(key => parsed.searchParams.delete(key));
        parsed.searchParams.sort();
        return parsed.toString();
    } catch {
        return value.trim().replace(/\/+$/, "").toLowerCase();
    }
}

function sourceUrls(article) {
    return [article?.url, article?.canonicalUrl, article?.canonicalURL, article?.canonical_url, article?.permalink]
        .map(normalizedUrl)
        .filter(Boolean);
}

function statusIds(article) {
    return sourceUrls(article)
        .map(url => url.match(/\/(?:i\/)?status\/(\d+)/i)?.[1])
        .filter(Boolean);
}

function isOriginalSourceCandidate(candidate, originalArticle) {
    if (!originalArticle) return false;

    if (candidate?.id && originalArticle?.id && candidate.id === originalArticle.id) {
        return true;
    }

    const originalUrls = new Set(sourceUrls(originalArticle));
    if (sourceUrls(candidate).some(url => originalUrls.has(url))) {
        return true;
    }

    const originalStatusIds = new Set(statusIds(originalArticle));
    return statusIds(candidate).some(id => originalStatusIds.has(id));
}

function formatEvidence(articles) {
    const sources = articles
        .map(article => article.url)
        .filter(url => typeof url === "string" && url.trim() !== "");
    const evidence = articles.map(article => ({
        title: article.title,
        content: article.content,
        source: article.source,
        url: article.url,
        publishedAt: article.publishedAt || null,
        platform: article.platform || null
    }));

    return { sources, evidence, articles };
}


// Retrieve external research from the Data service.
async function retrieveEvidence(claim, options = {}) {

    if (
        !claim ||
        typeof claim !== "string" ||
        claim.trim() === ""
    ) {
        throw new Error(
            "evidence.js: Claim must be a non-empty string"
        );
    }

    const cachedArticles = Array.isArray(options.articles)
        ? options.articles.filter(article => isRelevantEvidence(article, claimTokens(claim.trim())))
        : [];

    const url =
        `${DATA_API_URL}/api/evidence?query=` +
        encodeURIComponent(claim.trim());
    const startedAt = Date.now();
    console.log(`[EVIDENCE] start provider=exa query=${claim.trim()}`);

    let response;
    try {
        response = await fetch(url, {
            signal: AbortSignal.timeout(EVIDENCE_REQUEST_TIMEOUT_MS)
        });
    } catch (error) {
        console.log(`[EVIDENCE] provider=exa durationMs=${Date.now() - startedAt} status=${error?.name === "TimeoutError" ? "timeout" : "error"}`);
        const message = String(error?.message || "").toLowerCase();
        if (error?.name === "TimeoutError" || message.includes("timeout") || message.includes("aborted")) {
            const timeoutError = new Error("Evidence retrieval timed out");
            timeoutError.code = "EVIDENCE_TIMEOUT";
            throw timeoutError;
        }
        throw error;
    }

    if (!response.ok) {
        throw new Error(
            `evidence.js: Data service failed with status ${response.status}`
        );
    }

    const data = await response.json();

    if (
        !data ||
        !Array.isArray(data.evidence)
    ) {
        throw new Error(
            "evidence.js: Data service returned an invalid research response"
        );
    }

    console.log(`[EVIDENCE] provider=exa durationMs=${Date.now() - startedAt} candidateCount=${data.evidence.length} status=success`);
    const seen = new Set();
    const merged = [...data.evidence, ...cachedArticles].filter(article => {
        const key = article.url || `${article.title}|${article.source}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    const originalSource = options.article;
    const candidatesBeforeExclusion = merged.length;
    const independentCandidates = merged.filter(article => !isOriginalSourceCandidate(article, originalSource));
    const excludedSelfEvidenceCount = candidatesBeforeExclusion - independentCandidates.length;
    console.log(`[SOURCE_VERIFY] originalSource=${originalSource?.url || originalSource?.canonicalUrl || "none"}`);
    console.log(`[SOURCE_VERIFY] candidateCountBeforeExclusion=${candidatesBeforeExclusion}`);
    console.log(`[SOURCE_VERIFY] excludedSelfEvidenceCount=${excludedSelfEvidenceCount}`);
    console.log(`[SOURCE_VERIFY] candidateCountAfterExclusion=${independentCandidates.length}`);
    return formatEvidence(independentCandidates.slice(0, 10));
}


module.exports = {
    retrieveEvidence
};
