function calculateTruthScore(results, consensus) {

    if (!Array.isArray(results) || results.length === 0) {
        throw new Error("No verification results provided");
    }

    if (!consensus || !consensus.verdict) {
        throw new Error("Invalid consensus result");
    }

    // Calculate average model confidence
    const totalConfidence = results.reduce(
        (sum, item) => sum + item.result.confidence,
        0
    );

    const averageConfidence =
        totalConfidence / results.length;

    let truthScore;

    // Consensus says the claim is TRUE
    if (consensus.verdict === "TRUE") {

        truthScore = averageConfidence * 100;

    }

    // Consensus says the claim is FALSE
    else if (consensus.verdict === "FALSE") {

        truthScore = (1 - averageConfidence) * 100;

    }

    // Models cannot agree
    else {

        truthScore = 50;
    }

    return {
        truthScore: Number(truthScore.toFixed(2)),
        averageConfidence: Number(
            averageConfidence.toFixed(3)
        )
    };
}

module.exports = {
    calculateTruthScore
};