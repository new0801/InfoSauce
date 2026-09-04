function calculateConsensus(verification) {

    if (
        !verification ||
        !Array.isArray(
            verification.results
        )
    ) {
        throw new Error(
            "consensus.js: Invalid verification data"
        );
    }

    const results =
        verification.results;

    const failures =
        Array.isArray(
            verification.failures
        )
            ? verification.failures
            : [];

    const totalModels =
        results.length +
        failures.length;

    if (totalModels === 0) {
        throw new Error(
            "consensus.js: No verification models were attempted"
        );
    }

    const voteCounts = {
        TRUE: 0,
        FALSE: 0,
        UNCERTAIN: 0
    };

    /*
     * Count votes from successful models only.
     *
     * Failed models do not get a vote.
     */
    for (const item of results) {

        if (
            !item ||
            !item.result ||
            typeof item.result.verdict !==
                "string"
        ) {
            continue;
        }

        const verdict =
            item.result.verdict;

        if (
            Object.prototype.hasOwnProperty.call(
                voteCounts,
                verdict
            )
        ) {
            voteCounts[verdict]++;
        }
    }

    const totalVotes =
        voteCounts.TRUE +
        voteCounts.FALSE +
        voteCounts.UNCERTAIN;

    /*
     * No valid model votes.
     *
     * This is not a consensus.
     */
    if (totalVotes === 0) {
        return {
            verdict: "UNCERTAIN",

            voteCounts,

            totalModels,

            totalVotes: 0,

            failedModels:
                failures.length,

            consensusReached:
                false,

            disagreement:
                false
        };
    }

    /*
     * Find the highest vote count.
     */
    const highestVotes =
        Math.max(
            voteCounts.TRUE,
            voteCounts.FALSE,
            voteCounts.UNCERTAIN
        );

    const leaders =
        Object.keys(
            voteCounts
        ).filter(
            verdict =>
                voteCounts[verdict] ===
                highestVotes
        );

    /*
     * A tie means there is no consensus.
     *
     * Example:
     *
     * TRUE = 1
     * FALSE = 1
     */
    if (leaders.length > 1) {
        return {
            verdict: "UNCERTAIN",

            voteCounts,

            totalModels,

            totalVotes,

            failedModels:
                failures.length,

            consensusReached:
                false,

            disagreement:
                voteCounts.TRUE > 0 &&
                voteCounts.FALSE > 0
        };
    }

    const winningVerdict =
        leaders[0];

    /*
     * Consensus requires BOTH:
     *
     * 1. Every configured/intended model
     *    successfully responded.
     *
     * 2. One verdict has a strict majority.
     *
     * This prevents one successful model
     * from being treated as consensus when
     * another model failed.
     */
    const allModelsResponded =
        totalVotes === totalModels;

    const majorityReached =
        highestVotes >
        totalVotes / 2;

    const consensusReached =
        allModelsResponded &&
        majorityReached;

    /*
     * Explicit disagreement means that
     * at least one model said TRUE and
     * another said FALSE.
     *
     * TRUE + UNCERTAIN is not considered
     * direct disagreement.
     */
    const disagreement =
        voteCounts.TRUE > 0 &&
        voteCounts.FALSE > 0;

    return {
        verdict:
            consensusReached
                ? winningVerdict
                : "UNCERTAIN",

        voteCounts,

        totalModels,

        totalVotes,

        failedModels:
            failures.length,

        consensusReached,

        disagreement
    };
}

module.exports = {
    calculateConsensus
};

