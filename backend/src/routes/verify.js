const express = require("express");

const { verifyClaim } = require("../services/verifier");

const router = express.Router();

router.post("/verify", async (req, res) => {
    try {
        const { text } = req.body;

        // Validate the input
        if (!text || typeof text !== "string" || text.trim() === "") {
            return res.status(400).json({
                error: "Text is required and must be a non-empty string"
            });
        }

        const result = await verifyClaim(text);

        res.json({
            result: result
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Verification failed"
        });
    }
});

module.exports = router;
