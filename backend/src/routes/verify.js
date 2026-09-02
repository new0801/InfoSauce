const express = require("express");

const { verifyClaim } = require("../services/verifier");
const { calculateConsensus } = require("../services/consensus");
const { calculateTruthScore } = require("../services/truthscore");

const router = express.Router();

router.post("/verify", async (req, res) => {
    try {
        const input = req.body;
        // 1. Validate user input
        if (
            !input ||
            typeof input !== "object" ||
            !input.claim ||
            typeof input.claim !== "string" ||
            input.claim.trim() === "" ||
            !Array.isArray(input.sources) ||
            !Array.isArray(input.evidence)
        ) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "INVALID_INPUT",
                    message: "A valid claim, sources array, and evidence array are required"
                }
            });
        }

        // 2. Run AI verification
        const verification = await verifyClaim(input);

        // 3. Calculate consensus
        const consensus = calculateConsensus(
            verification
        );

        // 4. Calculate Truth Score
        const truthScore = calculateTruthScore(
            verification.results,
            consensus
        );

        // 5. Return successful response
        return res.status(200).json({

            success: true,

            claim: input.claim,

            verification: verification,

            consensus: consensus,

            truthScore: truthScore

        });

    } catch (error) {

        console.error("Verification failed:", error);

        if (error.code === "ALL_MODELS_FAILED") {
            return res.status(503).json({
                success: false,
                error: {
                    code: "VERIFICATION_UNAVAILABLE",
                    message: "All verification models failed. Please try again later."
                }
            });
        }

        return res.status(500).json({
            success: false,
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "An unexpected error occurred while processing the verification."
            }
        });
    }
});

module.exports = router;