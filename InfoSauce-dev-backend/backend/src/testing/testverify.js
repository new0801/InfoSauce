require("dotenv").config();

const { verifyClaim } = require("../services/verifier");

async function test() {
    const input = {
        newsId: "test-001",
        title: "Example fact-check",
        content: "The Earth is flat.",
        claim: "The Earth is flat.",
        sources: [
            "https://example.com/source"
        ],
        evidence: [
            "Scientific observations demonstrate that Earth is approximately spherical."
        ]
    };

    try {
        const result = await verifyClaim(input);

        console.log("===== VERIFICATION RESULT =====");
        console.log(JSON.stringify(result, null, 2));
        console.log("================================");

    } catch (error) {
        console.error("Verification failed:", error);
    }
}

test();