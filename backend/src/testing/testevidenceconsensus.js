const {
    calculateEvidenceConsensus
} = require("../services/evidenceconsensus");

function runTest() {

    console.log("=================================");
    console.log("EVIDENCE CONSENSUS TEST");
    console.log("=================================");

    // Simulate the results from our two evidence-selection models
    const selectionResults = [
        {
            model: "deepseek-ai/DeepSeek-V4-Flash-0731",
            selectedEvidence: [0, 2]
        },
        {
            model: "MiniMaxAI/MiniMax-M2.7",
            selectedEvidence: [0]
        }
    ];

    console.log("\nModel selections:");

    console.dir(
        selectionResults,
        { depth: null }
    );

    try {

        const consensus =
            calculateEvidenceConsensus(
                selectionResults
            );

        console.log("\n=================================");
        console.log("CONSENSUS RESULT");
        console.log("=================================");

        console.dir(
            consensus,
            { depth: null }
        );

        console.log("\n=================================");
        console.log("INTERPRETED RESULT");
        console.log("=================================");

        console.log(
            "Evidence selected by consensus:",
            consensus.selectedEvidence
        );

        for (const item of consensus.voteDetails) {

            console.log(
                `\nEvidence ${item.evidenceIndex}:`
            );

            console.log(
                `Votes: ${item.votes}/${item.totalModels}`
            );

            console.log(
                `Agreement: ${item.agreement * 100}%`
            );

            console.log(
                `Selected: ${item.selected}`
            );
        }

        console.log("\n=================================");
        console.log("TEST COMPLETE");
        console.log("=================================");

    } catch (error) {

        console.error(
            "\nTEST FAILED:"
        );

        console.error(error);
    }
}

runTest();