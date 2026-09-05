const { prepareAiInput } = require("./prepareAIInput");
const { verifyClaim } = require("./verifier");
const { calculateConsensus } = require("./consensus");
const { calculateTruthScore } = require("./truthscore");
const { verifyDailyArticle } = require("./dailyPipeline");

const retryableStatuses = new Set([
    "gonka_timeout",
    "gonka_http_error",
    "gonka_network_error",
    "gonka_polling_error",
    "gonka_failed",
    "failed"
]);

const defaults = { prepareAiInput, verifyClaim, calculateConsensus, calculateTruthScore, verifyDailyArticle };

function retryFailureStatus(error) {
    const statusByCode = {
        GONKA_TIMEOUT: "gonka_timeout",
        DAILY_VERIFICATION_TIMEOUT: "gonka_timeout",
        GONKA_HTTP_ERROR: "gonka_http_error",
        GONKA_NETWORK_ERROR: "gonka_network_error",
        GONKA_POLLING_ERROR: "gonka_polling_error",
        ALL_MODELS_FAILED: "gonka_failed"
    };
    return statusByCode[error?.code] || "gonka_failed";
}

function safeRetryMessage(status) {
    if (status === "gonka_timeout") return "Verification timed out. Try again.";
    return "Verification is temporarily unavailable. Try again.";
}

function hasReusableEvidence(article) {
    return typeof article?.claim === "string" && article.claim.trim() !== ""
        && Array.isArray(article.evidence)
        && article.evidence.some(item => item && typeof item === "object" && typeof item.content === "string" && item.content.trim() !== "");
}

function baseArticle(article) {
    const { verification, consensus, truthScore, verificationUnavailable, ...base } = article;
    return base;
}

async function retryDailyArticle(article, dependencies = defaults) {
    if (!article || typeof article !== "object") {
        const error = new Error("A Daily article is required for retry.");
        error.code = "INVALID_DAILY_ARTICLE";
        throw error;
    }

    if (!hasReusableEvidence(article)) {
        return dependencies.verifyDailyArticle(baseArticle(article));
    }

    const retried = baseArticle(article);
    const verificationTrace = [...(Array.isArray(article.verificationTrace) ? article.verificationTrace : []), { stage: "gonka_verification", status: "started", attempt: "retry" }];
    const evidence = article.evidence;
    const input = dependencies.prepareAiInput(retried, evidence);
    input.claim = article.claim.trim();
    input.evidence = evidence;

    try {
        const verification = await dependencies.verifyClaim(input);
        const consensus = dependencies.calculateConsensus(verification);
        const truthScore = dependencies.calculateTruthScore(verification.results, consensus);
        const requestIds = [...(verification.results || []), ...(verification.failures || [])]
            .map(item => item.requestId)
            .filter(Boolean);

        return {
            ...retried,
            claim: article.claim.trim(),
            factCheckable: true,
            evidenceStatus: "available",
            verificationStatus: "verified",
            evidence,
            verification,
            consensus,
            truthScore,
            verificationTrace: [...verificationTrace, { stage: "gonka_verification", status: "completed", attempt: "retry", requestIds }]
        };
    } catch (error) {
        const verificationStatus = retryFailureStatus(error);
        return {
            ...retried,
            claim: article.claim.trim(),
            factCheckable: false,
            evidenceStatus: "available",
            verificationStatus,
            verificationUnavailable: safeRetryMessage(verificationStatus),
            evidence,
            verificationTrace: [...verificationTrace, { stage: "gonka_verification", status: "failed", attempt: "retry", code: error?.code || "gonka_verification_error" }]
        };
    }
}

function isRetryableDailyArticle(article) {
    return retryableStatuses.has(article?.verificationStatus);
}

module.exports = { retryDailyArticle, isRetryableDailyArticle, hasReusableEvidence };
