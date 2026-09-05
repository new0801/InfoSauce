const express = require("express");
const { verifyClaim } = require("../services/verifier");
const { calculateConsensus } = require("../services/consensus");
const { calculateTruthScore } = require("../services/truthscore");
const { searchNews, getNewsByArea } = require("../services/data");
const { prepareAiInput } = require("../services/prepareAIInput");
const { extractClaim } = require("../services/claimextractor");
const { retrieveEvidence } = require("../services/evidence");
const { selectEvidence } = require("../services/evidenceselector");

const router = express.Router();
const MAX_CONCURRENT_AREAS = Math.max(
    1,
    Number.parseInt(process.env.MAX_CONCURRENT_AREAS || "2", 10) || 2
);
const MAX_CANDIDATES_PER_AREA = Math.min(
    10,
    Math.max(
        1,
        Number.parseInt(process.env.MAX_CANDIDATES_PER_AREA || "3", 10) || 3
    )
);

async function runWithConcurrency(items, concurrency, worker) {
    const results = new Array(items.length);
    let nextIndex = 0;

    async function runWorker() {
        while (nextIndex < items.length) {
            const index = nextIndex++;

            try {
                results[index] = {
                    status: "fulfilled",
                    value: await worker(items[index])
                };
            } catch (reason) {
                results[index] = { status: "rejected", reason };
            }
        }
    }

    await Promise.all(
        Array.from(
            { length: Math.min(concurrency, items.length) },
            runWorker
        )
    );

    return results;
}

// ======================================================
// POST /api/verify
// ======================================================

router.post("/verify", async (req, res) => {
try {
const input = req.body;
    // --------------------------------------------------
    // 1. Validate input
    // --------------------------------------------------
    if (
        !input ||
        typeof input !== "object" ||
        !input.claim ||
        typeof input.claim !== "string" ||
        input.claim.trim() === "" ||
        !Array.isArray(input.sources) ||
        !Array.isArray(input.evidence)
    ) {
        return res.status(400).json({
            success: false,
            error: {
                code: "INVALID_INPUT",
                message:
                    "A valid claim, sources array, and evidence array are required"
            }
        });
    }

    // --------------------------------------------------
    // 2. Run AI verification
    // --------------------------------------------------
    const verification = await verifyClaim(input);

    // --------------------------------------------------
    // 3. Calculate consensus
    // --------------------------------------------------
    const consensus = calculateConsensus(verification);

    // --------------------------------------------------
    // 4. Calculate Truth Score
    // --------------------------------------------------
    const truthScore = calculateTruthScore(
        verification.results,
        consensus
    );

    // --------------------------------------------------
    // 5. Return result
    // --------------------------------------------------
    return res.status(200).json({
        success: true,
        claim: input.claim.trim(),
        verification,
        consensus,
        truthScore
    });

} catch (error) {
    console.error("Verification failed:", error);

    if (error.code === "ALL_MODELS_FAILED") {
        return res.status(503).json({
            success: false,
            error: {
                code: "VERIFICATION_UNAVAILABLE",
                message:
                    "All verification models failed. Please try again later."
            }
        });
    }

    return res.status(500).json({
        success: false,
        error: {
            code: "INTERNAL_SERVER_ERROR",
            message:
                "An unexpected error occurred while processing the verification."
        }
    });
}


});

async function processArea(area) {
    console.log(`\n===== PROCESSING AREA: ${area} =====`);

    // 1. Get news specifically for this area
    const researchStart = Date.now();

    const newsItems = await getNewsByArea(area);

    console.log(
        `⏱️ RESEARCH TIME (${area}): ${
            Date.now() - researchStart
        } ms`
    );

    if (!Array.isArray(newsItems)) {
        throw new Error(
            `Invalid research response for area: ${area}`
        );
    }

    if (newsItems.length === 0) {
        throw new Error(
            `No news found for area: ${area}`
        );
    }

    // Try candidates in relevance order and stop after the first usable one.
    for (
        const newsItem of newsItems.slice(
            0,
            MAX_CANDIDATES_PER_AREA
        )
    ) {
        try {
            console.log(
                `\n--- TRYING NEWS ITEM: ${newsItem.id} ---`
            );

            // CLAIM EXTRACTION
            const claimStart = Date.now();

            const extractedClaim =
                await extractClaim(
                    newsItem.content
                );

            console.log(
                `⏱️ CLAIM EXTRACTION TIME: ${
                    Date.now() - claimStart
                } ms`
            );

            if (!extractedClaim.hasClaim) {
                console.log(
                    `⏭️ Skipping non-factual item: ${newsItem.id}`
                );

                continue;
            }

            const claim =
                extractedClaim.claim;

            console.log(
                `✅ FACTUAL CLAIM FOUND: ${claim}`
            );

            // EVIDENCE RETRIEVAL
            console.log(
                ">>> REACHED EVIDENCE RETRIEVAL"
            );

            const evidenceStart = Date.now();

            const evidenceResult =
                await retrieveEvidence(claim);

            console.log(
                `⏱️ EVIDENCE RETRIEVAL TIME: ${
                    Date.now() - evidenceStart
                } ms`
            );

            if (
                !evidenceResult ||
                !Array.isArray(
                    evidenceResult.evidence
                )
            ) {
                throw new Error(
                    "Invalid evidence retrieval response"
                );
            }

            console.log(
                ">>> EVIDENCE RETRIEVED:",
                evidenceResult.evidence.length
            );

            if (
                evidenceResult.evidence.length === 0
            ) {
                console.log(
                    `⏭️ No evidence found for ${newsItem.id}`
                );

                continue;
            }

            // EVIDENCE SELECTION
            const selectionStart =
                Date.now();

            const evidenceSelection =
                await selectEvidence(
                    claim,
                    evidenceResult.evidence
                );

            console.log(
                `⏱️ EVIDENCE SELECTION TIME: ${
                    Date.now() - selectionStart
                } ms`
            );

            if (
                !evidenceSelection ||
                !Array.isArray(
                    evidenceSelection.results
                ) ||
                evidenceSelection.results.length ===
                    0
            ) {
                console.log(
                    `⏭️ Evidence selection failed for ${newsItem.id}`
                );

                continue;
            }

            const selectedIndexes =
                evidenceSelection.results[0]
                    .selectedEvidence;

            if (
                !Array.isArray(selectedIndexes)
            ) {
                console.log(
                    `⏭️ Invalid evidence selection for ${newsItem.id}`
                );

                continue;
            }

            const selectedEvidence =
                selectedIndexes
                    .map(
                        index =>
                            evidenceResult.evidence[
                                index
                            ]
                    )
                    .filter(
                        item =>
                            item !== undefined
                    );

            console.log(
                ">>> SELECTED EVIDENCE:",
                selectedEvidence.length
            );

            if (
                selectedEvidence.length === 0
            ) {
                console.log(
                    `⏭️ No relevant evidence for ${newsItem.id}`
                );

                continue;
            }

            // PREPARE AI INPUT
            const aiInput =
                prepareAiInput(
                    newsItem,
                    selectedEvidence
                );

            aiInput.claim = claim;

            // FINAL VERIFICATION
            const verificationStart =
                Date.now();

            const verification =
                await verifyClaim(
                    aiInput
                );

            console.log(
                `⏱️ FINAL VERIFICATION TIME: ${
                    Date.now() -
                    verificationStart
                } ms`
            );

            // CONSENSUS
            const consensus =
                calculateConsensus(
                    verification
                );

            // TRUTH SCORE
            const truthScore =
                calculateTruthScore(
                    verification.results,
                    consensus
                );

            // VERIFICATION TRACE
            const verificationTrace =
                verification.results.map(
                    item => ({
                        model: item.model,
                        requestId:
                            item.requestId
                    })
                );

            // FORMAT EVIDENCE
            const evidence =
                selectedEvidence.map(
                    (item, index) => ({
                        evidenceIndex: index,
                        title:
                            item.title || null,
                        content:
                            item.content || null,
                        url:
                            item.url || null,
                        source:
                            item.source || null,
                        platform:
                            item.platform || null,
                        publishedAt:
                            item.publishedAt ||
                            null
                    })
                );

            // SUCCESS
            console.log(
                `✅ SUCCESSFULLY FACT-CHECKED: ${newsItem.id}`
            );

            return {
                area,
                news: newsItem,
                claim,
                factCheckable: true,
                evidenceSelection,
                evidence,
                verification,
                verificationTrace,
                consensus,
                truthScore
            };

        } catch (error) {
            console.error(
                `Failed to process news item ${newsItem.id} in area ${area}:`,
                error.message
            );

            continue;
        }
    }

    throw new Error(
        `Could not find a fact-checkable story for area: ${area}`
    );
}

// ======================================================
// POST /api/category
// ======================================================
router.post("/category", async (req, res) => {
    const startTime = Date.now();

    try {
        const { area, areas } = req.body;

        // Support:
        // { "area": "World" }
        // or:
        // { "areas": ["World", "Business", "Science", "Culture"] }

        const categoryAreas = Array.isArray(areas)
            ? areas
            : [area];

        // Validate
        if (
            !Array.isArray(categoryAreas) ||
            categoryAreas.length === 0 ||
            categoryAreas.some(
                item =>
                    typeof item !== "string" ||
                    item.trim() === ""
            )
        ) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "INVALID_AREA",
                    message:
                        "At least one non-empty area is required"
                }
            });
        }

        const requestedAreas =
            categoryAreas.map(
                item => item.trim()
            );

        // Maximum 4 areas
        if (requestedAreas.length > 4) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "TOO_MANY_AREAS",
                    message:
                        "A maximum of 4 areas is allowed"
                }
            });
        }

        console.log(
            "\n======================================"
        );

        console.log(
            "STARTING CATEGORY PROCESSING"
        );

        console.log(
            "AREAS:",
            requestedAreas
        );

        console.log(
            "======================================\n"
        );

        // A category can have up to four areas, and each area may fall back
        // through several candidates. Bound that fan-out so Gonka and the
        // data service do not queue or rate-limit every request.
        const areaResults =
            await runWithConcurrency(
                requestedAreas,
                MAX_CONCURRENT_AREAS,
                processArea
            );

        const results = [];
        const unavailableAreas = [];

        areaResults.forEach(
            (result, index) => {
                const area =
                    requestedAreas[index];

                if (
                    result.status ===
                    "fulfilled"
                ) {
                    results.push(
                        result.value
                    );
                } else {
                    console.error(
                        `❌ AREA FAILED: ${area}`,
                        result.reason?.message ||
                            result.reason
                    );

                    unavailableAreas.push(
                        area
                    );
                }
            }
        );

        console.log(
            `\n⏱️ CATEGORY TOTAL TIME: ${
                Date.now() - startTime
            } ms`
        );

        console.log(
            `✅ SUCCESSFUL AREAS: ${results.length}`
        );

        console.log(
            `❌ UNAVAILABLE AREAS: ${unavailableAreas.length}`
        );

        return res.status(200).json({
            success: true,
            areas: requestedAreas,
            count: results.length,
            results,
            unavailableAreas
        });

    } catch (error) {
        console.error(
            "Category verification failed:",
            error
        );

        return res.status(500).json({
            success: false,
            error: {
                code:
                    "INTERNAL_SERVER_ERROR",
                message:
                    "An unexpected error occurred while processing the categories"
            }
        });
    }
});

module.exports = router;
