require("dotenv").config();

const { retrieveEvidence } = require("../services/evidence");
const { selectEvidence } = require("../services/evidenceselector");
const { prepareAiInput } = require("../services/prepareAIInput");
const { verifyClaim } = require("../services/verifier");
const { calculateConsensus } = require("../services/consensus");
const { calculateTruthScore } = require("../services/truthscore");

async function testPipeline() {
    console.log("\n===== STARTING FULL PIPELINE TEST =====\n");

    const claim =
        "NASA's Apollo 11 mission landed humans on the Moon in 1969.";

    try {

        // =========================================================
        // 1. RETRIEVE EVIDENCE
        // =========================================================

        console.log("1. Retrieving evidence...");

        const evidenceResult =
            await retrieveEvidence(claim);

        console.log(
            `Evidence retrieved: ${evidenceResult.evidence.length}`
        );


        // =========================================================
        // 2. SELECT RELEVANT EVIDENCE
        // =========================================================

        console.log("\n2. Selecting evidence...");

        const evidenceSelection =
            await selectEvidence(
                claim,
                evidenceResult.evidence
            );

        console.log(
            "Evidence selection:",
            JSON.stringify(
                evidenceSelection,
                null,
                2
            )
        );


        // =========================================================
        // 3. GET DEEPSEEK'S SELECTED EVIDENCE
        // =========================================================

        if (
            !evidenceSelection.results ||
            evidenceSelection.results.length === 0
        ) {
            throw new Error(
                "No successful evidence selection result was returned."
            );
        }

        const selectedIndexes =
            evidenceSelection.results[0].selectedEvidence;

        console.log(
            "\nSelected evidence indexes:",
            selectedIndexes
        );


        // =========================================================
        // 4. MAP SELECTED INDEXES TO ACTUAL EVIDENCE
        // =========================================================

        const selectedEvidence =
            selectedIndexes.map(
                index => evidenceResult.evidence[index]
            );

        console.log(
            "\nSelected evidence:"
        );

        console.log(
            JSON.stringify(
                selectedEvidence,
                null,
                2
            )
        );


        // =========================================================
        // 5. CHECK THAT EVIDENCE EXISTS
        // =========================================================

        if (selectedEvidence.length === 0) {
            console.log(
                "\n❌ No relevant evidence was selected."
            );

            return;
        }


        // =========================================================
        // 6. PREPARE AI INPUT
        // =========================================================

        console.log(
            "\n3. Preparing AI input..."
        );

        const newsItem = {
            id: "test-apollo-11",
            title:
                "Apollo 11 Moon Landing",
            content:
                claim,
            url:
                "https://www.nasa.gov/",
            platform:
                "test"
        };

        const aiInput =
            prepareAiInput(
                newsItem,
                selectedEvidence
            );

        aiInput.claim = claim;

        console.log(
            "AI input:",
            JSON.stringify(
                aiInput,
                null,
                2
            )
        );


        // =========================================================
        // 7. FINAL VERIFICATION
        // =========================================================

        console.log(
            "\n4. Running final verification..."
        );

        const verification =
            await verifyClaim(aiInput);

        console.log(
            "Verification:",
            JSON.stringify(
                verification,
                null,
                2
            )
        );


        // =========================================================
        // 8. FINAL MODEL CONSENSUS
        // =========================================================

        console.log(
            "\n5. Calculating final consensus..."
        );

        const consensus =
            calculateConsensus(
                verification
            );

        console.log(
            "Consensus:",
            JSON.stringify(
                consensus,
                null,
                2
            )
        );


        // =========================================================
        // 9. TRUTH SCORE
        // =========================================================

        console.log(
            "\n6. Calculating Truth Score..."
        );

        const truthScore =
            calculateTruthScore(
                verification.results,
                consensus
            );

        console.log(
            "Truth Score:",
            JSON.stringify(
                truthScore,
                null,
                2
            )
        );


        // =========================================================
        // 10. FINAL PIPELINE RESULT
        // =========================================================

        console.log(
            "\n===== FULL PIPELINE RESULT =====\n"
        );

        console.log(
            JSON.stringify(
                {
                    claim,
                    selectedEvidence,
                    verification,
                    consensus,
                    truthScore
                },
                null,
                2
            )
        );

        console.log(
            "\n===== PIPELINE TEST COMPLETED SUCCESSFULLY =====\n"
        );

    } catch (error) {

        console.error(
            "\n❌ PIPELINE TEST FAILED:"
        );

        console.error(error);
    }
}

testPipeline();

