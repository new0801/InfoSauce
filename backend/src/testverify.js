require("dotenv").config();

const { verifyClaim } = require("./services/verifier");
const { calculateConsensus } = require("./services/consensus");
const { calculateTruthScore } = require("./services/truthscore");

async function test() {

    try {

        const results = await verifyClaim(
            "OpenAI is giving out 1000 free tokens for Codex"
        );

        console.log("Individual model results:");
        console.log(results);

        const consensus = calculateConsensus(results);

        console.log("\nConsensus result:");
        console.log(consensus);

        const truthScore = calculateTruthScore(
            results,
            consensus
        );

        console.log("\nTruth Score:");
        console.log(truthScore);

    } catch (error) {

        console.error("Verification failed:");
        console.error(error);
    }
}

test();