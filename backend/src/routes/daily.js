const express = require("express");
const { researchDailyNews } = require("../services/data");
const { verifyDailyArticle } = require("../services/dailyPipeline");
const { selectMostUsefulPerPlatform } = require("../services/articleRanking");
const { isRetryableDailyArticle, retryDailyArticle } = require("../services/dailyRetry");

const router = express.Router();
const MAX_CONCURRENT_DAILY_VERIFICATIONS = 1;

function verificationFailureStatus(error) {
    const statusByCode = {
        DAILY_VERIFICATION_TIMEOUT: "gonka_timeout",
        GONKA_TIMEOUT: "gonka_timeout",
        GONKA_HTTP_ERROR: "gonka_http_error",
        GONKA_AUTH_ERROR: "gonka_auth_error",
        GONKA_NETWORK_ERROR: "gonka_network_error",
        GONKA_POLLING_ERROR: "gonka_polling_error",
        ALL_MODELS_FAILED: "gonka_failed"
    };

    return statusByCode[error?.code] || "unavailable";
}

async function verifySelectedArticles(selectedArticles, verifyArticle, evidenceArticles) {
    const verifiedById = new Map();
    let nextIndex = 0;

    async function worker() {
        while (nextIndex < selectedArticles.length) {
            const article = selectedArticles[nextIndex++];
            try {
                verifiedById.set(article.id, await verifyArticle(article, {
                    evidenceArticles
                }));
            } catch (error) {
                verifiedById.set(article.id, {
                    ...article,
                    factCheckable: false,
                    verificationStatus: verificationFailureStatus(error),
                    verificationUnavailable:
                        error instanceof Error
                            ? error.message
                            : "Verification is unavailable."
                });
            }
        }
    }

    await Promise.all(
        Array.from(
            { length: Math.min(MAX_CONCURRENT_DAILY_VERIFICATIONS, selectedArticles.length) },
            worker
        )
    );

    return verifiedById;
}

async function buildDailyResponse(research, verifyArticle = verifyDailyArticle) {
    const selectedArticles = selectMostUsefulPerPlatform(
        research.news,
        research.query
    );
    const verifiedById = await verifySelectedArticles(
        selectedArticles,
        verifyArticle,
        research.news
    );

    return {
        query: research.query,
        platformResults: research.platformResults || [],
        unavailablePlatforms: research.unavailablePlatforms || [],
        selectedArticleIds: selectedArticles.map(article => article.id),
        articles: selectedArticles.map(article =>
            verifiedById.get(article.id) || {
                ...article,
                factCheckable: false,
                verificationStatus: "unavailable"
            }
        )
    };
}

router.post("/", async (req, res) => {
    try {
        const { query } = req.body || {};

        if (typeof query !== "string" || query.trim() === "") {
            return res.status(400).json({
                success: false,
                error: {
                    code: "INVALID_QUERY",
                    message: "A non-empty query is required"
                }
            });
        }

        const research = await researchDailyNews(query);
        const result = await buildDailyResponse(research);

        return res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error("Daily research failed:", error);

        return res.status(503).json({
            success: false,
            error: {
                code: "DAILY_RESEARCH_UNAVAILABLE",
                message: "DailySauce research is unavailable. Please try again later."
            }
        });
    }
});

router.post("/:articleId/verify", async (req, res) => {
    const article = req.body?.article;

    if (!article || typeof article !== "object" || article.id !== req.params.articleId) {
        return res.status(400).json({
            success: false,
            error: { code: "INVALID_DAILY_ARTICLE", message: "A matching Daily article is required." }
        });
    }

    if (!isRetryableDailyArticle(article)) {
        return res.status(400).json({
            success: false,
            error: { code: "DAILY_RETRY_NOT_AVAILABLE", message: "This article is not eligible for verification retry." }
        });
    }

    try {
        const retriedArticle = await retryDailyArticle(article);
        const success = retriedArticle.verificationStatus === "verified";
        return res.status(200).json({
            success,
            retryable: isRetryableDailyArticle(retriedArticle),
            article: retriedArticle,
            ...(success ? {} : { message: retriedArticle.verificationUnavailable || "Verification is temporarily unavailable. Try again." })
        });
    } catch {
        return res.status(503).json({
            success: false,
            retryable: true,
            message: "Verification is temporarily unavailable. Try again."
        });
    }
});

module.exports = router;
module.exports.selectMostUsefulPerPlatform = selectMostUsefulPerPlatform;
module.exports.buildDailyResponse = buildDailyResponse;
module.exports.verifySelectedArticles = verifySelectedArticles;
