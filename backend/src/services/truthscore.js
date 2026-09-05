const { configuredModelCount } = require("./models");

function truthScoreLabel(score) {
    if (score === null || !Number.isFinite(score)) return "No score available";
    if (score >= 90) return "Very strongly supported";
    if (score >= 75) return "Strongly supported";
    if (score >= 60) return "More likely true than false";
    if (score >= 40) return "Uncertain / insufficient evidence";
    if (score >= 25) return "More likely false than true";
    return "Very strongly contradicted";
}

function determineConsensusType(results) {
    if (results.length === 0) return "no_successful_models";
    if (results.length === 1) return "single_model_only";

    const verdicts = new Set(results.map(item => item.result.verdict));
    const hasTrue = verdicts.has("TRUE");
    const hasFalse = verdicts.has("FALSE");
    const hasUncertain = verdicts.has("UNCERTAIN");

    if (hasTrue && hasFalse) return "true_false_disagreement";
    if (hasTrue && hasUncertain) return "partial_true_uncertain";
    if (hasFalse && hasUncertain) return "partial_false_uncertain";
    if (hasTrue) return "agreement_true";
    if (hasFalse) return "agreement_false";
    return "agreement_uncertain";
}

function consensusFactorFor(type) {
    if (type === "true_false_disagreement") return 0.25;
    if (type === "partial_true_uncertain" || type === "partial_false_uncertain") return 0.5;
    if (type === "no_successful_models") return 0;
    return 1;
}

function verdictFor(type, consensus) {
    if (type === "no_successful_models") return "UNAVAILABLE";
    if (type === "true_false_disagreement") return "DISAGREEMENT";
    if (type === "agreement_true") return "TRUE";
    if (type === "agreement_false") return "FALSE";
    if (type === "agreement_uncertain") return "UNCERTAIN";
    return consensus?.verdict || "UNCERTAIN";
}

function calculateTruthScore(
    results,
    consensus
) {
    if (
        !Array.isArray(results)
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
    const successfulResults = [];

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
            successfulResults.push(item);

        }
        else if (verdict === "FALSE") {

            totalScore -= confidence;
            validScoreCount++;
            successfulResults.push(item);

        }
        else if (verdict === "UNCERTAIN") {

            // UNCERTAIN contributes zero,
            // but it is still a valid model vote.
            validScoreCount++;
            successfulResults.push(item);
        }
    }

    if (validScoreCount === 0) {
        return {
            truthScore: null,
            truthScoreLabel: truthScoreLabel(null),
            evidenceScore: null,
            baseScore: null,
            successfulModels: 0,
            configuredModels: configuredModelCount,
            coverage: 0,
            reliability: 0.5,
            consensusType: "no_successful_models",
            consensusFactor: 0,
            verdict: "UNAVAILABLE",
            consensus: false,
            averageConfidence: 0,
            modelResults: []
        };
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
        validScoreCount;

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
            validScoreCount /
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

    const consensusType = determineConsensusType(successfulResults);
    const consensusFactor = consensusFactorFor(consensusType);

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

        truthScoreLabel: truthScoreLabel(truthScore),

        evidenceScore:
            Number(
                averageModelScore.toFixed(4)
            ),

        successfulModels: validScoreCount,

        configuredModels: configuredModelCount,

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

        consensusFactor,

        consensusType,

        verdict: verdictFor(consensusType, consensus),

        consensus: consensusType,

        modelResults: successfulResults.map(item => ({
            model: item.model || null,
            verdict: item.result.verdict,
            confidence: item.result.confidence
        }))
    };
}

module.exports = {
    calculateTruthScore,
    truthScoreLabel
};

