const { calculateConsensus } = require("./consensus");
const { calculateTruthScore } = require("./truthscore");
const { extractClaim } = require("./claimextractor");
const { retrieveEvidence } = require("./evidence");
const { selectEvidence } = require("./evidenceselector");
const { prepareAiInput } = require("./prepareAIInput");
const { verifyClaim } = require("./verifier");
const { verifyExtractedClaim } = require("./claimVerificationEngine");

const DEFAULT_DAILY_ARTICLE_TIMEOUT_MS = 150_000;

const defaultDependencies = {
    extractClaim,
    retrieveEvidence,
    selectEvidence,
    prepareAiInput,
    verifyClaim,
    calculateConsensus,
    calculateTruthScore
};

function dailyTimeoutError() {
    const error = new Error("Daily article verification timed out");
    error.code = "DAILY_VERIFICATION_TIMEOUT";
    return error;
}

function verificationFailureStatus(error) {
    const statusByCode = {
        GONKA_TIMEOUT: "gonka_timeout",
        GONKA_HTTP_ERROR: "gonka_http_error",
        GONKA_AUTH_ERROR: "gonka_auth_error",
        GONKA_NETWORK_ERROR: "gonka_network_error",
        GONKA_POLLING_ERROR: "gonka_polling_error",
        ALL_MODELS_FAILED: "gonka_failed"
    };

    return statusByCode[error?.code] || "unavailable";
}

function appendTrace(trace, stage, status, details = {}) {
    trace.push({ stage, status, ...details });
}

function logDailyVerification(newsItem, event, details = {}) {
    console.log(`[DAILY VERIFY] ${event} ${JSON.stringify({
        platform: newsItem.platform || null,
        articleId: newsItem.id || null,
        articleTitle: typeof newsItem.title === "string"
            ? newsItem.title.replace(/\s+/g, " ").slice(0, 240)
            : null,
        ...details
    })}`);
}

function conciseHeadline(article, claim) {
    const candidate = [claim, article.content, article.title]
        .find(value => typeof value === "string" && value.trim()) || "DailySauce article";
    const normalized = candidate.replace(/\s+/g, " ").trim();
    const sentence = normalized.split(/(?<=[.!?。！？])\s+/)[0] || normalized;

    return sentence.length <= 150
        ? sentence
        : `${sentence.slice(0, 147).trimEnd()}...`;
}

function withTimeout(operation, timeoutMs) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(
            () => reject(dailyTimeoutError()),
            timeoutMs
        );

        Promise.resolve(operation).then(
            result => {
                clearTimeout(timer);
                resolve(result);
            },
            error => {
                clearTimeout(timer);
                reject(error);
            }
        );
    });
}

function extractionContext(article) {
    return [
        `Title: ${article.title || "Not provided"}`,
        `Content: ${article.content || "Not provided"}`,
        `Source: ${article.source || "Not provided"}`,
        `Platform: ${article.platform || "Not provided"}`,
        `Published: ${article.publishedAt || "Not provided"}`
    ].join("\n");
}

function fallbackClaimFromArticle(article) {
    const candidates = [article.title, article.content]
        .filter(value => typeof value === "string")
        .map(value => value.trim())
        .filter(Boolean);
    const factualEvent = /\b(announced|released|published|acquired|raised|reached|introduced|launched|confirmed|reported|said)\b|(?:宣布|发布|投资|收购|融资|达到|推出|证实|报道|表示|抢发|估值)|(?:\d+(?:\.\d+)?\s*(?:亿|万|million|billion|亿美元|亿元)|投\s*\d)/i;

    return candidates.find(candidate =>
        factualEvent.test(candidate) &&
        !/[?！!]$/.test(candidate)
    ) || null;
}

async function extractBestClaim(newsItem, dependencies, trace) {
    try {
        appendTrace(trace, "claim_extraction", "started", { attempt: "content" });
        const primary = await dependencies.extractClaim(newsItem.content);
        if (primary?.hasClaim && typeof primary.claim === "string" && primary.claim.trim()) {
            appendTrace(trace, "claim_extraction", "succeeded", { attempt: "content" });
            return primary.claim.trim();
        }
        appendTrace(trace, "claim_extraction", "no_claim", { attempt: "content" });
    } catch (error) {
        appendTrace(trace, "claim_extraction", "failed", { code: error?.code || "claim_extraction_error" });
    }

    const context = extractionContext(newsItem);
    if (context !== newsItem.content) {
        try {
            appendTrace(trace, "claim_extraction", "started", { attempt: "title_content_metadata" });
            const fallback = await dependencies.extractClaim(context);
            if (fallback?.hasClaim && typeof fallback.claim === "string" && fallback.claim.trim()) {
                appendTrace(trace, "claim_extraction", "succeeded", { attempt: "title_content_metadata" });
                return fallback.claim.trim();
            }
            appendTrace(trace, "claim_extraction", "no_claim", { attempt: "title_content_metadata" });
        } catch (error) {
            appendTrace(trace, "claim_extraction", "failed", { code: error?.code || "claim_extraction_error" });
        }
    }

    const fallbackClaim = fallbackClaimFromArticle(newsItem);
    appendTrace(trace, "claim_extraction", fallbackClaim ? "succeeded" : "not_verifiable", {
        attempt: "article_supported_fallback"
    });
    return fallbackClaim;
}

async function verifyDailyArticleSteps(newsItem, dependencies, options) {
    const verificationTrace = [];
    const claim = await extractBestClaim(newsItem, dependencies, verificationTrace);
    const headline = conciseHeadline(newsItem, claim);

    logDailyVerification(newsItem, "claim extracted", {
        claim: claim || null,
        fallbackUsed: verificationTrace.some(item => item.attempt === "article_supported_fallback" && item.status === "succeeded")
    });

    if (!claim) {
        appendTrace(verificationTrace, "evidence_retrieval", "not_applicable");
        appendTrace(verificationTrace, "evidence_selection", "not_applicable");
        appendTrace(verificationTrace, "gonka_verification", "not_applicable");
        const result = {
            ...newsItem,
            headline,
            factCheckable: false,
            evidenceStatus: "not_applicable",
            verificationStatus: "not_verifiable",
            verificationUnavailable: "No verifiable factual claim was found.",
            verificationTrace
        };
        logDailyVerification(newsItem, "final status", { evidenceStatus: result.evidenceStatus, verificationStatus: result.verificationStatus, gonkaCalled: false });
        return result;
    }

    const sharedResult = await verifyExtractedClaim(claim, {
        article: newsItem,
        evidenceArticles: options.evidenceArticles,
        verificationTrace
    }, dependencies);

    if (sharedResult.verificationStatus === "completed") {
        sharedResult.verificationStatus = "verified";
    }
    sharedResult.verificationTrace = sharedResult.verificationTrace.map(item => ({
        ...item,
        status: item.status === "completed" ? "succeeded" : item.status
    }));

    return {
        ...newsItem,
        headline,
        ...sharedResult
    };

    let evidenceResult;
    try {
        appendTrace(verificationTrace, "evidence_retrieval", "started");
        evidenceResult = await dependencies.retrieveEvidence(claim, {
            articles: options.evidenceArticles
        });
    } catch (error) {
        const evidenceStatus = error?.code === "EVIDENCE_TIMEOUT" ? "timeout" : "unavailable";
        appendTrace(verificationTrace, "evidence_retrieval", "failed", {
            code: error?.code || "evidence_retrieval_error"
        });
        appendTrace(verificationTrace, "evidence_selection", "not_applicable");
        appendTrace(verificationTrace, "gonka_verification", "not_applicable");
        const result = {
            ...newsItem,
            headline,
            claim,
            factCheckable: false,
            evidenceStatus,
            verificationStatus: error?.code === "EVIDENCE_TIMEOUT"
                ? "evidence_timeout"
                : "evidence_unavailable",
            verificationUnavailable: error instanceof Error
                ? error.message
                : "Evidence retrieval is unavailable.",
            verificationTrace
        };
        logDailyVerification(newsItem, "evidence retrieval failed", { claim, evidenceCandidates: 0, errorCode: error?.code || "evidence_retrieval_error", gonkaCalled: false });
        return result;
    }

    if (!Array.isArray(evidenceResult?.evidence) || evidenceResult.evidence.length === 0) {
        appendTrace(verificationTrace, "evidence_retrieval", "unavailable");
        appendTrace(verificationTrace, "evidence_selection", "not_applicable");
        appendTrace(verificationTrace, "gonka_verification", "not_applicable");
        const result = {
            ...newsItem,
            headline,
            claim,
            factCheckable: false,
            evidenceStatus: "unavailable",
            verificationStatus: "evidence_unavailable",
            verificationUnavailable: "No supporting evidence was available.",
            verificationTrace
        };
        logDailyVerification(newsItem, "evidence retrieval empty", { claim, evidenceCandidates: 0, gonkaCalled: false });
        return result;
    }

    appendTrace(verificationTrace, "evidence_retrieval", "succeeded", {
        evidenceCount: evidenceResult.evidence.length
    });
    logDailyVerification(newsItem, "evidence candidates", {
        claim,
        evidenceCandidates: evidenceResult.evidence.length,
        candidates: evidenceResult.evidence.slice(0, 3).map((item, index) => ({
            index,
            title: item.title || null,
            url: item.url || null,
            source: item.source || null,
            contentLength: typeof item.content === "string" ? item.content.length : 0
        }))
    });
    appendTrace(verificationTrace, "evidence_selection", "started");
    let evidenceSelection;
    try {
        evidenceSelection = await dependencies.selectEvidence(claim, evidenceResult.evidence);
    } catch (error) {
        const errorCode = error?.code || "evidence_selection_error";
        appendTrace(verificationTrace, "evidence_selection", "failed", { code: errorCode });
        appendTrace(verificationTrace, "gonka_verification", "not_applicable", { pollAttempts: 0 });
        const result = {
            ...newsItem,
            headline,
            claim,
            factCheckable: false,
            evidenceStatus: errorCode === "GONKA_TIMEOUT" ? "timeout" : "unavailable",
            verificationStatus: verificationFailureStatus(error),
            verificationUnavailable: error instanceof Error
                ? error.message
                : "Evidence selection is unavailable.",
            verificationTrace
        };
        logDailyVerification(newsItem, "evidence selection failed", {
            claim,
            selectedEvidenceCount: 0,
            errorCode,
            gonkaCalled: true
        });
        return result;
    }
    const selectedIndexes = evidenceSelection?.results?.[0]?.selectedEvidence;

    if (!Array.isArray(selectedIndexes)) {
        const failure = evidenceSelection?.failures?.[0];
        appendTrace(verificationTrace, "evidence_selection", "failed", {
            code: failure?.code || "evidence_selection_error"
        });
        appendTrace(verificationTrace, "gonka_verification", "not_applicable", { pollAttempts: 0 });
        const result = {
            ...newsItem,
            headline,
            claim,
            factCheckable: false,
            evidenceStatus: failure?.code === "GONKA_TIMEOUT" ? "timeout" : "unavailable",
            verificationStatus: verificationFailureStatus(failure),
            verificationUnavailable: failure?.error || "Evidence selection did not return usable evidence.",
            verificationTrace
        };
        logDailyVerification(newsItem, "evidence selection failed", { claim, selectedEvidenceCount: 0, selectionReason: failure?.error || "no usable selection", gonkaCalled: false });
        return result;
    }

    const evidence = selectedIndexes
        .map(index => evidenceResult.evidence[index])
        .filter(item => item !== undefined);

    if (evidence.length === 0) {
        appendTrace(verificationTrace, "evidence_selection", "unavailable");
        appendTrace(verificationTrace, "gonka_verification", "not_applicable", { pollAttempts: 0 });
        const result = {
            ...newsItem,
            headline,
            claim,
            factCheckable: false,
            evidenceStatus: "unavailable",
            verificationStatus: "evidence_unavailable",
            verificationUnavailable: "No relevant evidence was selected.",
            verificationTrace
        };
        logDailyVerification(newsItem, "evidence selection empty", { claim, selectedEvidenceCount: 0, selectionReason: "no relevant evidence", gonkaCalled: false });
        return result;
    }

    appendTrace(verificationTrace, "evidence_selection", "succeeded", {
        selectedEvidenceCount: evidence.length
    });
    logDailyVerification(newsItem, "evidence selected", {
        claim,
        selectedEvidenceCount: evidence.length,
        selectedEvidence: evidence.map((item, index) => ({ index, title: item.title || null, url: item.url || null, source: item.source || null })),
        selectionReason: evidenceSelection?.results?.[0]?.selectionReason || "gonka_selection"
    });
    const aiInput = dependencies.prepareAiInput(newsItem, evidence);
    aiInput.claim = claim;

    let verification;
    try {
        appendTrace(verificationTrace, "gonka_verification", "started", { pollAttempts: 0 });
        logDailyVerification(newsItem, "gonka verification started", { claim, gonkaCalled: true });
        verification = await dependencies.verifyClaim(aiInput);
    } catch (error) {
        appendTrace(verificationTrace, "gonka_verification", "failed", {
            code: error?.code || "gonka_verification_error",
            pollAttempts: 0
        });
        const result = {
            ...newsItem,
            headline,
            claim,
            factCheckable: false,
            evidenceStatus: "available",
            evidence,
            evidenceSelection,
            verificationStatus: verificationFailureStatus(error),
            verificationUnavailable: error instanceof Error ? error.message : "Gonka verification is unavailable.",
            verificationTrace
        };
        logDailyVerification(newsItem, "final status", { evidenceStatus: result.evidenceStatus, verificationStatus: result.verificationStatus, gonkaCalled: true, errorCode: error?.code || "gonka_verification_error" });
        return result;
    }
    const consensus = dependencies.calculateConsensus(verification);
    const truthScore = dependencies.calculateTruthScore(verification.results, consensus);
    const requestIds = [...verification.results, ...(verification.failures || [])]
        .map(item => item.requestId)
        .filter(requestId => typeof requestId === "string");
    appendTrace(verificationTrace, "gonka_verification", "succeeded", { requestIds, pollAttempts: 0 });

    const result = {
        ...newsItem,
        headline,
        claim,
        factCheckable: true,
        evidenceStatus: "available",
        verificationStatus: "verified",
        evidence,
        evidenceSelection,
        verification,
        consensus,
        truthScore,
        verificationTrace
    };
    logDailyVerification(newsItem, "final status", { evidenceStatus: result.evidenceStatus, verificationStatus: result.verificationStatus, gonkaCalled: true, requestIds });
    return result;
}

function verifyDailyArticle(newsItem, dependencies = defaultDependencies, options = {}) {
    if (typeof dependencies?.extractClaim !== "function") {
        options = dependencies || {};
        dependencies = defaultDependencies;
    }

    return withTimeout(
        verifyDailyArticleSteps(newsItem, dependencies, options),
        options.timeoutMs || DEFAULT_DAILY_ARTICLE_TIMEOUT_MS
    ).catch(error => {
        if (error?.code !== "DAILY_VERIFICATION_TIMEOUT") throw error;

        return {
            ...newsItem,
            headline: conciseHeadline(newsItem),
            factCheckable: false,
            evidenceStatus: "timeout",
            verificationStatus: "gonka_timeout",
            verificationUnavailable: error.message,
            verificationTrace: [{ stage: "daily_pipeline", status: "timeout", code: error.code }]
        };
    });
}

module.exports = {
    verifyDailyArticle
};
