function calculateConsensus(results) {
    if (!Array.isArray(results) || results.length === 0) {
        throw new Error("No verification results provided");
    }

    const voteCounts = {
        TRUE: 0,
        FALSE: 0,
        UNCERTAIN: 0
    };

    // Count each model's vote
    for (const item of results) {

        const verdict = item.result.verdict;

        if (voteCounts[verdict] !== undefined) {
            voteCounts[verdict]++;
        }
    }

    // Find the verdict with the most votes
    let finalVerdict = "UNCERTAIN";
    let highestVotes = 0;

    for (const verdict of Object.keys(voteCounts)) {

        if (voteCounts[verdict] > highestVotes) {
            highestVotes = voteCounts[verdict];
            finalVerdict = verdict;
        }
    }

    const consensusReached = highestVotes > results.length / 2;

    if (!consensusReached) {
        finalVerdict = "UNCERTAIN";
    }

    return {
        verdict: finalVerdict,
        voteCounts: voteCounts,
        totalModels: results.length,
        consensusReached: consensusReached
    };
}

module.exports = {
    calculateConsensus
};