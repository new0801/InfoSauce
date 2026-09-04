const express = require("express");
const { verifyClaim } = require("../services/verifier");
const { calculateConsensus } = require("../services/consensus");
const { calculateTruthScore } = require("../services/truthscore");
const { searchNews, getNewsByArea } = require("../services/data");
const { prepareAiInput } = require("../services/prepareAIInput");
const { extractClaim } = require("../services/claimextractor");
const { retrieveEvidence } = require("../services/evidence");

const router = express.Router();

const MAX_CONCURRENT_AREAS = Math.max(
    1,
    Number.parseInt(
        process.env.MAX_CONCURRENT_AREAS || "2",
        10
    ) || 2
);

const MAX_NEWS_CANDIDATES_PER_AREA = Math.min(
    10,
    Math.max(
        3,
        Number.parseInt(
            process.env.MAX_CANDIDATES_PER_AREA || "6",
            10
        ) || 6
    )
);

const MAX_SELECTED_EVIDENCE = 5;


// ======================================================
// CONCURRENCY
// ======================================================

async function runWithConcurrency(
    items,
    concurrency,
    worker
) {
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
                results[index] = {
                    status: "rejected",
                    reason
                };
            }
        }
    }

    await Promise.all(
        Array.from(
            {
                length: Math.min(
                    concurrency,
                    items.length
                )
            },
            runWorker
        )
    );

    return results;
}


// ======================================================
// TEXT HELPERS
// ======================================================

function normalizeText(text) {
    if (
        typeof text !== "string"
    ) {
        return "";
    }

    return text
        .toLowerCase()
        .replace(
            /[^a-z0-9\s]/g,
            " "
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}


function getMeaningfulWords(text) {
    const stopWords = new Set([
        "about",
        "after",
        "again",
        "against",
        "also",
        "because",
        "before",
        "being",
        "between",
        "could",
        "from",
        "have",
        "into",
        "more",
        "most",
        "other",
        "over",
        "same",
        "should",
        "some",
        "such",
        "than",
        "that",
        "their",
        "there",
        "these",
        "they",
        "this",
        "those",
        "through",
        "under",
        "very",
        "what",
        "when",
        "where",
        "which",
        "while",
        "with",
        "would",
        "will",
        "were",
        "been",
        "being",
        "said",
        "says",
        "news",
        "according",
        "reported",
        "reports",
        "report"
    ]);

    return [
        ...new Set(
            normalizeText(text)
                .split(" ")
                .filter(
                    word =>
                        word.length >= 3 &&
                        !stopWords.has(word)
                )
        )
    ];
}


// ======================================================
// EVIDENCE RANKING
// ======================================================

function calculateEvidenceScore(
    claim,
    evidenceItem
) {
    const claimWords =
        getMeaningfulWords(
            claim
        );

    if (
        claimWords.length === 0
    ) {
        return 0;
    }

    const title =
        normalizeText(
            evidenceItem.title
        );

    const content =
        normalizeText(
            evidenceItem.content
        );

    const source =
        normalizeText(
            evidenceItem.source
        );

    const combinedText =
        `${title} ${content}`;

    let score = 0;

    // --------------------------------------------------
    // 1. Claim word overlap
    // --------------------------------------------------

    let matchedWords = 0;

    for (
        const word of claimWords
    ) {
        if (
            combinedText.includes(word)
        ) {
            matchedWords++;
        }
    }

    const overlapRatio =
        matchedWords /
        claimWords.length;

    score +=
        overlapRatio * 60;


    // --------------------------------------------------
    // 2. Title relevance
    // --------------------------------------------------

    let titleMatches = 0;

    for (
        const word of claimWords
    ) {
        if (
            title.includes(word)
        ) {
            titleMatches++;
        }
    }

    const titleRatio =
        titleMatches /
        claimWords.length;

    score +=
        titleRatio * 20;


    // --------------------------------------------------
    // 3. Source availability
    // --------------------------------------------------

    if (
        typeof evidenceItem.url ===
            "string" &&
        evidenceItem.url.trim() !== ""
    ) {
        score += 5;
    }


    // --------------------------------------------------
    // 4. Source quality hints
    // --------------------------------------------------

    const highAuthoritySources = [
        "reuters",
        "associated press",
        "ap news",
        "bbc",
        "bloomberg",
        "cnn",
        "cnbc",
        "guardian",
        "new york times",
        "washington post",
        "united nations",
        "un news",
        "who",
        "nasa",
        "government",
        "gov",
        "microsoft",
        "google",
        "apple",
        "meta",
        "openai",
        "bighit",
        "hybe"
    ];

    for (
        const authority
        of highAuthoritySources
    ) {
        if (
            source.includes(authority) ||
            title.includes(authority)
        ) {
            score += 15;
            break;
        }
    }


    return score;
}


function getEvidenceKey(
    item
) {
    if (
        typeof item.url === "string" &&
        item.url.trim() !== ""
    ) {
        return item.url
            .trim()
            .toLowerCase();
    }

    return (
        normalizeText(
            item.title
        ) +
        "|" +
        normalizeText(
            item.source
        )
    );
}


function rankEvidence(
    claim,
    evidence
) {
    if (
        !Array.isArray(evidence)
    ) {
        return [];
    }

    const uniqueEvidence = [];
    const seen = new Set();

    for (
        const item of evidence
    ) {
        if (
            !item ||
            typeof item !== "object"
        ) {
            continue;
        }

        const key =
            getEvidenceKey(item);

        if (
            seen.has(key)
        ) {
            continue;
        }

        seen.add(key);

        uniqueEvidence.push({
            ...item,
            _score:
                calculateEvidenceScore(
                    claim,
                    item
                )
        });
    }

    uniqueEvidence.sort(
        (a, b) =>
            b._score - a._score
    );

    return uniqueEvidence
        .slice(
            0,
            MAX_SELECTED_EVIDENCE
        )
        .map(
            item => {
                const {
                    _score,
                    ...cleanItem
                } = item;

                return cleanItem;
            }
        );
}


// ======================================================
// POST /api/verify
// ======================================================

router.post(
    "/verify",
    async (req, res) => {
        try {
            const input =
                req.body;

            // --------------------------------------------------
            // 1. Validate input
            // --------------------------------------------------

            if (
                !input ||
                typeof input !== "object" ||
                !input.claim ||
                typeof input.claim !== "string" ||
                input.claim.trim() === "" ||
                !Array.isArray(
                    input.sources
                ) ||
                !Array.isArray(
                    input.evidence
                )
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        error: {
                            code:
                                "INVALID_INPUT",
                            message:
                                "A valid claim, sources array, and evidence array are required"
                        }
                    });
            }

            // --------------------------------------------------
            // 2. Run AI verification
            // --------------------------------------------------

            const verification =
                await verifyClaim(
                    input
                );

            // --------------------------------------------------
            // 3. Consensus
            // --------------------------------------------------

            const consensus =
                calculateConsensus(
                    verification
                );

            // --------------------------------------------------
            // 4. Truth Score
            // --------------------------------------------------

            const truthScore =
                calculateTruthScore(
                    verification.results,
                    consensus
                );

            // --------------------------------------------------
            // 5. Return result
            // --------------------------------------------------

            return res
                .status(200)
                .json({
                    success: true,
                    claim:
                        input.claim.trim(),
                    verification,
                    consensus,
                    truthScore
                });

        } catch (error) {
            console.error(
                "Verification failed:",
                error
            );

            if (
                error.code ===
                "ALL_MODELS_FAILED"
            ) {
                return res
                    .status(503)
                    .json({
                        success: false,
                        error: {
                            code:
                                "VERIFICATION_UNAVAILABLE",
                            message:
                                "All verification models failed. Please try again later."
                        }
                    });
            }

            return res
                .status(500)
                .json({
                    success: false,
                    error: {
                        code:
                            "INTERNAL_SERVER_ERROR",
                        message:
                            "An unexpected error occurred while processing the verification."
                    }
                });
        }
    }
);


// ======================================================
// PROCESS ONE TRENDING AREA
// ======================================================

async function processArea(
    area
) {
    console.log(
        `\n===== PROCESSING AREA: ${area} =====`
    );

    // --------------------------------------------------
    // 1. Retrieve news
    // --------------------------------------------------

    const researchStart =
        Date.now();

    const newsItems =
        await getNewsByArea(
            area
        );

    console.log(
        `⏱️ RESEARCH TIME (${area}): ${
            Date.now() -
            researchStart
        } ms`
    );

    if (
        !Array.isArray(
            newsItems
        )
    ) {
        throw new Error(
            `Invalid research response for area: ${area}`
        );
    }

    if (
        newsItems.length === 0
    ) {
        throw new Error(
            `No news found for area: ${area}`
        );
    }

    console.log(
        `📰 NEWS CANDIDATES (${area}): ${newsItems.length}`
    );


    // --------------------------------------------------
    // 2. Try multiple stories
    // --------------------------------------------------

    const candidates =
        newsItems.slice(
            0,
            Math.min(
                MAX_NEWS_CANDIDATES_PER_AREA,
                newsItems.length
            )
        );

    for (
        let candidateIndex = 0;
        candidateIndex <
        candidates.length;
        candidateIndex++
    ) {
        const newsItem =
            candidates[
                candidateIndex
            ];

        try {
            console.log(
                `\n--- TRYING NEWS ITEM ${candidateIndex + 1}/${candidates.length}: ${newsItem.id} ---`
            );


            // --------------------------------------------------
            // CLAIM EXTRACTION
            // --------------------------------------------------

            const claimStart =
                Date.now();

            const extractedClaim =
                await extractClaim(
                    newsItem.content
                );

            console.log(
                `⏱️ CLAIM EXTRACTION TIME: ${
                    Date.now() -
                    claimStart
                } ms`
            );

            if (
                !extractedClaim ||
                !extractedClaim.hasClaim ||
                typeof extractedClaim.claim !==
                    "string" ||
                extractedClaim.claim.trim() === ""
            ) {
                console.log(
                    `⏭️ Skipping non-factual item: ${newsItem.id}`
                );

                continue;
            }

            const claim =
                extractedClaim.claim.trim();

            console.log(
                `✅ FACTUAL CLAIM FOUND: ${claim}`
            );


            // --------------------------------------------------
            // EVIDENCE RETRIEVAL
            // --------------------------------------------------

            console.log(
                ">>> REACHED EVIDENCE RETRIEVAL"
            );

            const evidenceStart =
                Date.now();

            const evidenceResult =
                await retrieveEvidence(
                    claim
                );

            console.log(
                `⏱️ EVIDENCE RETRIEVAL TIME: ${
                    Date.now() -
                    evidenceStart
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
                `>>> EVIDENCE RETRIEVED: ${evidenceResult.evidence.length}`
            );

            if (
                evidenceResult.evidence.length ===
                0
            ) {
                console.log(
                    `⏭️ No evidence found for ${newsItem.id}`
                );

                continue;
            }


            // --------------------------------------------------
            // 3. Deterministic evidence ranking
            // --------------------------------------------------

            const selectionStart =
                Date.now();

            const selectedEvidence =
                rankEvidence(
                    claim,
                    evidenceResult.evidence
                );

            console.log(
                `⏱️ EVIDENCE RANKING TIME: ${
                    Date.now() -
                    selectionStart
                } ms`
            );

            console.log(
                `>>> SELECTED EVIDENCE: ${selectedEvidence.length}`
            );

            selectedEvidence.forEach(
                (item, index) => {
                    console.log(
                        `   [${index}] ${
                            item.source ||
                            "Unknown source"
                        } - ${
                            item.title ||
                            "Untitled"
                        }`
                    );
                }
            );

            if (
                selectedEvidence.length ===
                0
            ) {
                console.log(
                    `⏭️ No usable evidence for ${newsItem.id}`
                );

                continue;
            }


            // --------------------------------------------------
            // 4. Prepare AI input
            // --------------------------------------------------

            const aiInput =
                prepareAiInput(
                    newsItem,
                    selectedEvidence
                );

            aiInput.claim =
                claim;


            // --------------------------------------------------
            // 5. FINAL VERIFICATION
            // --------------------------------------------------

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


            // --------------------------------------------------
            // 6. CONSENSUS
            // --------------------------------------------------

            const consensus =
                calculateConsensus(
                    verification
                );


            // --------------------------------------------------
            // 7. TRUTH SCORE
            // --------------------------------------------------

            const truthScore =
                calculateTruthScore(
                    verification.results,
                    consensus
                );


            // --------------------------------------------------
            // 8. VERIFICATION TRACE
            // --------------------------------------------------

            const verificationTrace =
                verification.results.map(
                    item => ({
                        model:
                            item.model,
                        requestId:
                            item.requestId
                    })
                );


            // --------------------------------------------------
            // 9. FORMAT EVIDENCE
            // --------------------------------------------------

            const evidence =
                selectedEvidence.map(
                    (
                        item,
                        index
                    ) => ({
                        evidenceIndex:
                            index,
                        title:
                            item.title ||
                            null,
                        content:
                            item.content ||
                            null,
                        url:
                            item.url ||
                            null,
                        source:
                            item.source ||
                            null,
                        platform:
                            item.platform ||
                            null,
                        publishedAt:
                            item.publishedAt ||
                            null
                    })
                );


            // --------------------------------------------------
            // 10. Evidence selection metadata
            // --------------------------------------------------

            const evidenceSelection = {
                method:
                    "deterministic-ranking",
                candidatesConsidered:
                    evidenceResult
                        .evidence
                        .length,
                selectedCount:
                    selectedEvidence
                        .length
            };


            // --------------------------------------------------
            // SUCCESS
            // --------------------------------------------------

            console.log(
                `✅ SUCCESSFULLY FACT-CHECKED: ${newsItem.id}`
            );

            return {
                area,
                news:
                    newsItem,
                claim,
                factCheckable:
                    true,
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

router.post(
    "/category",
    async (req, res) => {
        const startTime =
            Date.now();

        try {
            const {
                area,
                areas
            } = req.body;

            // --------------------------------------------------
            // Support:
            // { "area": "World" }
            //
            // or:
            // { "areas": ["World", "Business"] }
            // --------------------------------------------------

            const categoryAreas =
                Array.isArray(areas)
                    ? areas
                    : [area];

            // --------------------------------------------------
            // Validate
            // --------------------------------------------------

            if (
                !Array.isArray(
                    categoryAreas
                ) ||
                categoryAreas.length ===
                    0 ||
                categoryAreas.some(
                    item =>
                        typeof item !==
                            "string" ||
                        item.trim() === ""
                )
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        error: {
                            code:
                                "INVALID_AREA",
                            message:
                                "At least one non-empty area is required"
                        }
                    });
            }

            const requestedAreas =
                categoryAreas.map(
                    item =>
                        item.trim()
                );

            // --------------------------------------------------
            // Maximum 4 areas
            // --------------------------------------------------

            if (
                requestedAreas.length >
                4
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        error: {
                            code:
                                "TOO_MANY_AREAS",
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


            // --------------------------------------------------
            // Process areas concurrently
            // --------------------------------------------------

            const areaResults =
                await runWithConcurrency(
                    requestedAreas,
                    MAX_CONCURRENT_AREAS,
                    processArea
                );


            // --------------------------------------------------
            // Separate successful and failed areas
            // --------------------------------------------------

            const results = [];
            const unavailableAreas =
                [];

            areaResults.forEach(
                (
                    result,
                    index
                ) => {
                    const area =
                        requestedAreas[
                            index
                        ];

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
                            result.reason
                                ?.message ||
                                result.reason
                        );

                        unavailableAreas.push(
                            area
                        );
                    }
                }
            );


            // --------------------------------------------------
            // Timing
            // --------------------------------------------------

            console.log(
                `\n⏱️ CATEGORY TOTAL TIME: ${
                    Date.now() -
                    startTime
                } ms`
            );

            console.log(
                `✅ SUCCESSFUL AREAS: ${results.length}`
            );

            console.log(
                `❌ UNAVAILABLE AREAS: ${unavailableAreas.length}`
            );


            // --------------------------------------------------
            // Return
            // --------------------------------------------------

            return res
                .status(200)
                .json({
                    success: true,
                    areas:
                        requestedAreas,
                    count:
                        results.length,
                    results,
                    unavailableAreas
                });

        } catch (error) {
            console.error(
                "Category verification failed:",
                error
            );

            return res
                .status(500)
                .json({
                    success: false,
                    error: {
                        code:
                            "INTERNAL_SERVER_ERROR",
                        message:
                            "An unexpected error occurred while processing the categories"
                    }
                });
        }
    }
);

module.exports = router;