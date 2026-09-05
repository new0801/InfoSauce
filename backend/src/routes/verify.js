const express = require("express");

const { verifyClaim } = require("../services/verifier");
const { calculateConsensus } = require("../services/consensus");
const { calculateTruthScore } = require("../services/truthscore");
const { getVerifyCase } = require("../data/demoData");

const router = express.Router();

router.get("/verify-cases", (req, res) => {
    const { verifyCases } = require("../data/demoData");

    return res.status(200).json({
        success: true,
        cases: verifyCases.map((item) => ({
            id: item.id,
            label: item.label,
            claim: item.claim,
        })),
    });
});

router.post("/verify", async (req, res) => {
    try {
        let input = req.body;

        // Demo mode:
        // Frontend can send { caseId: "VERIFY001" }
        if (input?.caseId) {
            const demoCase = getVerifyCase(input.caseId);

            if (!demoCase) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: "DEMO_CASE_NOT_FOUND",
                        message: "The requested verification case was not found.",
                    },
                });
            }

            input = {
                claim: demoCase.claim,
                sources: demoCase.sources,
                evidence: demoCase.evidence,
            };
        }

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
                    message:
                        "A valid claim, sources array, and evidence array are required",
                },
            });
        }

        // LIVE Gonka verification
        const verification = await verifyClaim(input);

        const consensus = calculateConsensus(verification);

        const truthScore = calculateTruthScore(
            verification.results,
            consensus
        );

        return res.status(200).json({
            success: true,
            claim: input.claim,
            sources: input.sources,
            evidence: input.evidence,
            verification,
            consensus,
            truthScore,
        });
    } catch (error) {
        console.error("Verification failed:", error);

        if (error.code === "ALL_MODELS_FAILED") {
            return res.status(503).json({
                success: false,
                error: {
                    code: "VERIFICATION_UNAVAILABLE",
                    message:
                        "All verification models failed. Please try again later.",
                },
            });
        }

        return res.status(500).json({
            success: false,
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message:
                    "An unexpected error occurred while processing the verification.",
            },
        });
    }
});

module.exports = router;