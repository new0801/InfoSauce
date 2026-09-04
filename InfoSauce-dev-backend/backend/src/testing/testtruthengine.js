const { calculateConsensus } = require("../services/consensus");
const { calculateTruthScore } = require("../services/truthscore");

function runTest(name, verification) {

    console.log("\n========================================");
    console.log(name);
    console.log("========================================");

    try {

        // Run consensus
        const consensus = calculateConsensus(verification);

        console.log("\nConsensus:");
        console.log(JSON.stringify(consensus, null, 2));

        // Run Truth Score
        const truthScore = calculateTruthScore(
            verification.results,
            consensus
        );

        console.log("\nTruth Score:");
        console.log(JSON.stringify(truthScore, null, 2));

    } catch (error) {

        console.error("\nTEST FAILED:");
        console.error(error);
    }
}


// ============================================================
// CASE 1 — TRUE + TRUE
// ============================================================

runTest("CASE 1: TRUE + TRUE", {

    results: [
        {
            model: "DeepSeek",
            result: {
                verdict: "TRUE",
                confidence: 0.95
            }
        },
        {
            model: "MiniMax",
            result: {
                verdict: "TRUE",
                confidence: 0.90
            }
        }
    ],

    failures: []
});


// ============================================================
// CASE 2 — FALSE + FALSE
// ============================================================

runTest("CASE 2: FALSE + FALSE", {

    results: [
        {
            model: "DeepSeek",
            result: {
                verdict: "FALSE",
                confidence: 0.95
            }
        },
        {
            model: "MiniMax",
            result: {
                verdict: "FALSE",
                confidence: 0.90
            }
        }
    ],

    failures: []
});


// ============================================================
// CASE 3 — UNCERTAIN + UNCERTAIN
// ============================================================

runTest("CASE 3: UNCERTAIN + UNCERTAIN", {

    results: [
        {
            model: "DeepSeek",
            result: {
                verdict: "UNCERTAIN",
                confidence: 0.80
            }
        },
        {
            model: "MiniMax",
            result: {
                verdict: "UNCERTAIN",
                confidence: 0.60
            }
        }
    ],

    failures: []
});


// ============================================================
// CASE 4 — TRUE + FALSE
// ============================================================

runTest("CASE 4: TRUE + FALSE", {

    results: [
        {
            model: "DeepSeek",
            result: {
                verdict: "TRUE",
                confidence: 0.90
            }
        },
        {
            model: "MiniMax",
            result: {
                verdict: "FALSE",
                confidence: 0.80
            }
        }
    ],

    failures: []
});


// ============================================================
// CASE 5 — TRUE + UNCERTAIN
// ============================================================

runTest("CASE 5: TRUE + UNCERTAIN", {

    results: [
        {
            model: "DeepSeek",
            result: {
                verdict: "TRUE",
                confidence: 0.90
            }
        },
        {
            model: "MiniMax",
            result: {
                verdict: "UNCERTAIN",
                confidence: 0.50
            }
        }
    ],

    failures: []
});


// ============================================================
// CASE 6 — FALSE + UNCERTAIN
// ============================================================

runTest("CASE 6: FALSE + UNCERTAIN", {

    results: [
        {
            model: "DeepSeek",
            result: {
                verdict: "FALSE",
                confidence: 0.90
            }
        },
        {
            model: "MiniMax",
            result: {
                verdict: "UNCERTAIN",
                confidence: 0.50
            }
        }
    ],

    failures: []
});


// ============================================================
// CASE 7 — TRUE + FAILED
// ============================================================

runTest("CASE 7: TRUE + FAILED", {

    results: [
        {
            model: "DeepSeek",
            result: {
                verdict: "TRUE",
                confidence: 0.90
            }
        }
    ],

    failures: [
        {
            model: "MiniMax",
            status: "failed",
            error: "Gonka API error: 524"
        }
    ]
});


// ============================================================
// CASE 8 — FALSE + FAILED
// ============================================================

runTest("CASE 8: FALSE + FAILED", {

    results: [
        {
            model: "DeepSeek",
            result: {
                verdict: "FALSE",
                confidence: 0.90
            }
        }
    ],

    failures: [
        {
            model: "MiniMax",
            status: "failed",
            error: "Gonka API error: 524"
        }
    ]
});


// ============================================================
// CASE 9 — UNCERTAIN + FAILED
// ============================================================

runTest("CASE 9: UNCERTAIN + FAILED", {

    results: [
        {
            model: "DeepSeek",
            result: {
                verdict: "UNCERTAIN",
                confidence: 0.70
            }
        }
    ],

    failures: [
        {
            model: "MiniMax",
            status: "failed",
            error: "Gonka API error: 524"
        }
    ]
});


// ============================================================
// CASE 10 — DIFFERENT CONFIDENCE LEVELS
// ============================================================

runTest("CASE 10: TRUE + TRUE WITH DIFFERENT CONFIDENCE", {

    results: [
        {
            model: "DeepSeek",
            result: {
                verdict: "TRUE",
                confidence: 1.0
            }
        },
        {
            model: "MiniMax",
            result: {
                verdict: "TRUE",
                confidence: 0.60
            }
        }
    ],

    failures: []
});


// ============================================================
// CASE 11 — ALL MODELS FAILED
// ============================================================

runTest("CASE 11: ALL MODELS FAILED", {

    results: [],

    failures: [
        {
            model: "DeepSeek",
            status: "failed",
            error: "Gonka API error: 524"
        },
        {
            model: "MiniMax",
            status: "failed",
            error: "Gonka API error: 524"
        }
    ]
});

