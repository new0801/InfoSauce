const { configuredModelCount } = require("./models");

function calculateTruthScore(
    results,
    consensus
) {
    if (
        !Array.isArray(results) ||
        results.length === 0
    ) {
        throw new Error(
            "truthscore.js: No verification results provided"
        );
    }

    if (
        !consensus ||
        typeof consensus !== "object"
    ) {
        throw new Error(
            "truthscore.js: Consensus result is required"
        );
    }

    if (
        !consensus.voteCounts ||
        typeof consensus.voteCounts !== "object"
    ) {
        throw new Error(
            "truthscore.js: Consensus vote counts are required"
        );
    }

    if (
        !Number.isInteger(
            configuredModelCount
        ) ||
        configuredModelCount <= 0
    ) {
        throw new Error(
            "truthscore.js: Invalid configured model count"
        );
    }

    // --------------------------------------------------
    // STEP 1: Convert each model verdict into a score
    // --------------------------------------------------
    //
    // TRUE      = +confidence
    // FALSE     = -confidence
    // UNCERTAIN = 0
    //
    // Confidence is already validated by verifier.js.
    // Invalid result objects are ignored defensively.
    //

    let totalScore = 0;
    let validScoreCount = 0;

    for (const item of results) {

        if (
            !item ||
            !item.result ||
            typeof item.result.verdict !==
                "string" ||
            typeof item.result.confidence !==
                "number" ||
            !Number.isFinite(
                item.result.confidence
            )
        ) {
            continue;
        }

        const verdict =
            item.result.verdict;

        const confidence =
            item.result.confidence;

        if (verdict === "TRUE") {

            totalScore += confidence;
            validScoreCount++;

        }
        else if (verdict === "FALSE") {

            totalScore -= confidence;
            validScoreCount++;

        }
        else if (verdict === "UNCERTAIN") {

            // UNCERTAIN contributes zero,
            // but it is still a valid model vote.
            validScoreCount++;
        }
    }

    if (validScoreCount === 0) {
        throw new Error(
            "truthscore.js: No valid model scores available"
        );
    }

    // --------------------------------------------------
    // STEP 2: Calculate average model score
    // --------------------------------------------------
    //
    // IMPORTANT:
    // Divide by successful verification results,
    // not by configured models.
    //
    // This means a failed model does not secretly
    // become an UNCERTAIN vote.
    //

    const averageModelScore =
        totalScore /
        results.length;

    // --------------------------------------------------
    // STEP 3: Convert -1...+1 into 0...100
    // --------------------------------------------------
    //
    // -1 → 0
    //  0 → 50
    // +1 → 100
    //

    const baseScore =
        (
            (averageModelScore + 1) /
            2
        ) * 100;

    // --------------------------------------------------
    // STEP 4: Calculate model coverage
    // --------------------------------------------------
    //
    // Example:
    //
    // Configured models = 3
    // Successful models = 2
    //
    // coverage = 2 / 3
    //

    const coverage =
        Math.min(
            results.length /
                configuredModelCount,
            1
        );

    // --------------------------------------------------
    // STEP 5: Calculate reliability
    // --------------------------------------------------
    //
    // Full coverage:
    // reliability = 1
    //
    // Half coverage:
    // reliability = 0.75
    //
    // No coverage:
    // reliability = 0.5
    //
    // This pulls incomplete results toward 50
    // rather than destroying the score.
    //

    const reliability =
        0.5 +
        (0.5 * coverage);

    // --------------------------------------------------
    // STEP 6: Determine consensus adjustment
    // --------------------------------------------------

    let consensusFactor = 1;

    if (
        !consensus.consensusReached
    ) {

        const hasTrue =
            consensus.voteCounts.TRUE >
            0;

        const hasFalse =
            consensus.voteCounts.FALSE >
            0;

        /*
         * Explicit TRUE/FALSE disagreement
         * receives the strongest penalty.
         */
        if (
            hasTrue &&
            hasFalse
        ) {
            consensusFactor = 0.25;
        }

        /*
         * Other forms of no-consensus,
         * such as TRUE + UNCERTAIN,
         * receive a less severe penalty.
         */
        else {
            consensusFactor = 0.5;
        }
    }

    // --------------------------------------------------
    // STEP 7: Shrink score toward 50
    // --------------------------------------------------

    let truthScore =
        50 +
        (
            baseScore - 50
        ) *
        reliability *
        consensusFactor;

    // --------------------------------------------------
    // STEP 8: Clamp score between 0 and 100
    // --------------------------------------------------

    truthScore =
        Math.max(
            0,
            Math.min(
                100,
                truthScore
            )
        );

    truthScore =
        Number(
            truthScore.toFixed(2)
        );

    // --------------------------------------------------
    // STEP 9: Calculate average confidence
    // --------------------------------------------------

    let totalConfidence = 0;
    let confidenceCount = 0;

    for (const item of results) {

        if (
            item &&
            item.result &&
            typeof item.result.confidence ===
                "number" &&
            Number.isFinite(
                item.result.confidence
            )
        ) {
            totalConfidence +=
                item.result.confidence;

            confidenceCount++;
        }
    }

    const averageConfidence =
        confidenceCount > 0
            ? Number(
                (
                    totalConfidence /
                    confidenceCount
                ).toFixed(2)
            )
            : 0;

    // --------------------------------------------------
    // Return scoring information
    // --------------------------------------------------

    return {
        truthScore,

        averageConfidence,

        baseScore:
            Number(
                baseScore.toFixed(2)
            ),

        coverage:
            Number(
                coverage.toFixed(2)
            ),

        reliability:
            Number(
                reliability.toFixed(2)
            ),

        consensusFactor
    };
}

module.exports = {
    calculateTruthScore
};

