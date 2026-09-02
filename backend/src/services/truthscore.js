function calculateTruthScore(results, consensus) {
    if (!Array.isArray(results) || results.length === 0) {
        throw new Error("truthscore.js: No verification results provided");
    }

    if (!consensus || typeof consensus !== "object") {
        throw new Error("truthscore.js: Consensus result is required");
    }

    // --------------------------------------------------
    // STEP 1: Convert each model's verdict into a score
    // --------------------------------------------------
    //
    // TRUE      = +confidence
    // FALSE     = -confidence
    // UNCERTAIN = 0
    //

    let totalScore = 0;

    for (const item of results) {

        if (
            !item ||
            !item.result ||
            typeof item.result.verdict !== "string" ||
            typeof item.result.confidence !== "number"
        ) {
            continue;
        }

        const verdict = item.result.verdict;
        const confidence = item.result.confidence;

        if (verdict === "TRUE") {
            totalScore += confidence;
        }
        else if (verdict === "FALSE") {
            totalScore -= confidence;
        }
        // UNCERTAIN contributes 0
    }

    // --------------------------------------------------
    // STEP 2: Calculate the average model score
    // --------------------------------------------------

    const averageModelScore = totalScore / results.length;

    // --------------------------------------------------
    // STEP 3: Convert -1...+1 into 0...100
    // --------------------------------------------------

    const baseScore =
        ((averageModelScore + 1) / 2) * 100;

    // --------------------------------------------------
    // STEP 4: Calculate model coverage
    // --------------------------------------------------
    //
    // Example:
    // 3 configured models
    // 2 successful models
    //
    // coverage = 2 / 3
    //

    const configuredModels = 3;

    const coverage =
        Math.min(results.length / configuredModels, 1);

    // --------------------------------------------------
    // STEP 5: Calculate reliability
    // --------------------------------------------------
    //
    // We don't want missing models to destroy the score.
    // Instead, incomplete coverage pulls the score toward 50.
    //

    const reliability =
        0.5 + (0.5 * coverage);

    // --------------------------------------------------
    // STEP 6: Determine consensus adjustment
    // --------------------------------------------------

    let consensusFactor = 1;

    if (!consensus.consensusReached) {

        // If models actively disagree, be conservative.
        //
        // This prevents the system from producing an
        // extremely high or extremely low Truth Score
        // when there is no agreement.

        const hasTrue = consensus.voteCounts.TRUE > 0;
        const hasFalse = consensus.voteCounts.FALSE > 0;

        if (hasTrue && hasFalse) {
            consensusFactor = 0.25;
        }
        else {
            consensusFactor = 0.5;
        }
    }

    // --------------------------------------------------
    // STEP 7: Shrink score toward 50
    // --------------------------------------------------

    let truthScore =
        50 +
        (baseScore - 50) *
        reliability *
        consensusFactor;

    // --------------------------------------------------
    // STEP 8: Clamp score between 0 and 100
    // --------------------------------------------------

    truthScore = Math.max(0, Math.min(100, truthScore));

    // Round to 2 decimal places
    truthScore = Number(truthScore.toFixed(2));

    // --------------------------------------------------
    // STEP 9: Calculate average confidence
    // --------------------------------------------------

    let totalConfidence = 0;
    let confidenceCount = 0;

    for (const item of results) {

        if (
            item &&
            item.result &&
            typeof item.result.confidence === "number"
        ) {
            totalConfidence += item.result.confidence;
            confidenceCount++;
        }
    }

    const averageConfidence =
        confidenceCount > 0
            ? Number((totalConfidence / confidenceCount).toFixed(2))
            : 0;

    // --------------------------------------------------
    // Return complete scoring information
    // --------------------------------------------------

    return {
        truthScore,
        averageConfidence,

        baseScore: Number(baseScore.toFixed(2)),
        coverage: Number(coverage.toFixed(2)),
        reliability: Number(reliability.toFixed(2)),
        consensusFactor
    };

}

module.exports = {
    calculateTruthScore
};
