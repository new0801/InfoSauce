function calculateConsensus(verification) {

    if (
        !verification ||
        !Array.isArray(verification.results)
    ) {
        throw new Error("consensus.js: Invalid verification data");
    }

    const results = verification.results;
    const failures = Array.isArray(verification.failures)
        ? verification.failures
        : [];

    const totalModels = results.length + failures.length;

    if (totalModels === 0) {
        throw new Error("consensus.js: No verification models were attempted");
    }

    const voteCounts = {
        TRUE: 0,
        FALSE: 0,
        UNCERTAIN: 0
    };

    // Count successful model votes only
    for (const item of results) {

        if (
            !item ||
            !item.result ||
            typeof item.result.verdict !== "string"
        ) {
            continue;
        }

        const verdict = item.result.verdict;

        if (voteCounts[verdict] !== undefined) {
            voteCounts[verdict]++;
        }
    }

    const totalVotes =
        voteCounts.TRUE +
        voteCounts.FALSE +
        voteCounts.UNCERTAIN;

    if (totalVotes === 0) {
        return {
            verdict: "UNCERTAIN",
            voteCounts,
            totalModels,
            totalVotes: 0,
            failedModels: failures.length,
            consensusReached: false,
            disagreement: false
        };
    }

    // Find highest vote count
    const highestVotes = Math.max(
        voteCounts.TRUE,
        voteCounts.FALSE,
        voteCounts.UNCERTAIN
    );

    const leaders = Object.keys(voteCounts).filter(
        verdict => voteCounts[verdict] === highestVotes
    );

    // A tie means there is no consensus
    if (leaders.length > 1) {
        return {
            verdict: "UNCERTAIN",
            voteCounts,
            totalModels,
            totalVotes,
            failedModels: failures.length,
            consensusReached: false,
            disagreement: true
        };
    }

    const winningVerdict = leaders[0];

    // Consensus requires:
    // 1. Every intended model successfully responded
    // 2. One verdict has a strict majority
    const allModelsResponded =
        totalVotes === totalModels;

    const majorityReached =
        highestVotes > totalVotes / 2;

    const consensusReached =
        allModelsResponded && majorityReached;

    return {
        verdict: consensusReached
            ? winningVerdict
            : "UNCERTAIN",

        voteCounts,

        totalModels,

        totalVotes,

        failedModels: failures.length,

        consensusReached,

        disagreement:
            voteCounts.TRUE > 0 &&
            voteCounts.FALSE > 0
    };
}

module.exports = {
    calculateConsensus
};