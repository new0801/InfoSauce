const express = require("express");
const { prepareAiInput } = require("../services/prepareAIInput");
const { verifyClaim, configuredModelCount } = require("../services/verifier");
const { calculateConsensus } = require("../services/consensus");
const { calculateTruthScore } = require("../services/truthscore");
const {
    DEMO_NOTICE,
    getDailyArticle,
    getVerifiableCase,
    listDailyArticles,
    listTrending
} = require("../data/demo/catalog");

function normalizeFailureCategory(error) {
    const message = String(error || "").toLowerCase();

    if (message.includes("timeout") || message.includes("abort")) {
        return "timeout";
    }

    if (
        message.includes("401") ||
        message.includes("403") ||
        message.includes("auth")
    ) {
        return "auth";
    }

    if (
        message.includes("network") ||
        message.includes("fetch") ||
        message.includes("econn") ||
        message.includes("enotfound")
    ) {
        return "network";
    }

    return "request_failure";
}

function createVerificationSummary(verification, modelCount) {
    const results = Array.isArray(verification.results)
        ? verification.results
        : [];
    const failures = Array.isArray(verification.failures)
        ? verification.failures
        : [];
    const configuredModels = Math.max(
        Number.isInteger(modelCount) ? modelCount : 0,
        results.length + failures.length
    );
    const successfulModels = results.length;
    const failedModels = Math.max(
        failures.length,
        configuredModels - successfulModels
    );
    const failedModelNames = failures
        .map(item => item && item.model)
        .filter(name => typeof name === "string" && name.trim() !== "");

    return {
        mode:
            successfulModels === configuredModels
                ? "full"
                : "degraded",
        degraded: successfulModels !== configuredModels,
        successfulModels,
        configuredModels,
        failedModels,
        failedModelNames,
        failureCategories: failures.map(item => ({
            model:
                typeof item?.model === "string"
                    ? item.model
                    : "Unknown model",
            category: normalizeFailureCategory(item?.error || item?.status)
        }))
    };
}

function sanitizeFailures(failures) {
    return (Array.isArray(failures) ? failures : []).map(item => ({
        model:
            typeof item?.model === "string"
                ? item.model
                : "Unknown model",
        status: "failed",
        category: normalizeFailureCategory(item?.error || item?.status)
    }));
}

function createDemoRouter(dependencies = {}) {
    const router = express.Router();
    const verify = dependencies.verifyClaim || verifyClaim;
    const prepare = dependencies.prepareAiInput || prepareAiInput;
    const consensusCalculator =
        dependencies.calculateConsensus || calculateConsensus;
    const truthScoreCalculator =
        dependencies.calculateTruthScore || calculateTruthScore;
    const modelCount =
        dependencies.configuredModelCount ?? configuredModelCount;

    router.get("/trending", (_req, res) => {
        res.json({
            success: true,
            demoMode: true,
            notice: DEMO_NOTICE,
            topics: listTrending()
        });
    });

    router.get("/daily", (_req, res) => {
        res.json({
            success: true,
            demoMode: true,
            notice: DEMO_NOTICE,
            articles: listDailyArticles()
        });
    });

    router.get("/daily/:id", (req, res) => {
        const article = getDailyArticle(req.params.id);

        if (!article) {
            return res.status(404).json({
                success: false,
                error: {
                    code: "DEMO_ARTICLE_NOT_FOUND",
                    message: "The requested demo article was not found."
                }
            });
        }

        return res.json({
            success: true,
            demoMode: true,
            notice: DEMO_NOTICE,
            article
        });
    });

    router.post("/verify/:caseId", async (req, res) => {
        const demoCase = getVerifiableCase(req.params.caseId);

        if (!demoCase) {
            return res.status(404).json({
                success: false,
                error: {
                    code: "DEMO_CASE_NOT_FOUND",
                    message:
                        "This demo case is unavailable for live Gonka verification."
                }
            });
        }

        try {
            const aiInput = prepare(
                {
                    id: demoCase.article.id,
                    title: demoCase.article.title,
                    content: demoCase.article.summary,
                    url: demoCase.article.url
                },
                demoCase.evidence
            );

            aiInput.claim = demoCase.claim;

            const verification = await verify(aiInput);
            const consensus = consensusCalculator(verification);
            const truthScore = truthScoreCalculator(
                verification.results,
                consensus
            );
            const verificationSummary = createVerificationSummary(
                verification,
                modelCount
            );
            const requestIds = verification.results
                .filter(
                    item =>
                        typeof item?.model === "string" &&
                        typeof item?.requestId === "string"
                )
                .map(item => ({
                    model: item.model,
                    requestId: item.requestId
                }));

            return res.json({
                success: true,
                demoMode: true,
                notice: DEMO_NOTICE,
                claim: demoCase.claim,
                evidence: demoCase.evidence,
                verification: {
                    results: verification.results,
                    failures: sanitizeFailures(verification.failures)
                },
                verificationTrace: requestIds,
                verificationSummary,
                consensus,
                truthScore
            });
        } catch (error) {
            const allModelsFailed = error?.code === "ALL_MODELS_FAILED";

            return res.status(allModelsFailed ? 502 : 500).json({
                success: false,
                error: {
                    code:
                        allModelsFailed
                            ? "GONKA_VERIFICATION_FAILED"
                            : "DEMO_VERIFICATION_FAILED",
                    message:
                        allModelsFailed
                            ? "Live Gonka verification could not be completed."
                            : "The demo verification could not be completed."
                }
            });
        }
    });

    return router;
}

module.exports = {
    createDemoRouter,
    createVerificationSummary,
    normalizeFailureCategory
};
