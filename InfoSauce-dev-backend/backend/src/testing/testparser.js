const {
    parseVerificationResponse
} = require("./services/verifier");

function testParser(name, response) {

    try {

        const result = parseVerificationResponse(response);

        console.log(`\n✅ ${name}`);
        console.log(result);

    } catch (error) {

        console.log(`\n❌ ${name}`);
        console.log("Error:", error.message);
    }
}

// Test 1: Normal JSON
testParser(
    "Normal JSON",
    `{
        "verdict": "TRUE",
        "confidence": 0.95,
        "reasoning": "The claim is supported.",
        "evidence": ["Evidence 1"]
    }`
);


// Test 2: MiniMax <think> format
testParser(
    "Think + JSON",
    `<think>
        Some internal reasoning here...
        More reasoning...
    </think>

    {
        "verdict": "FALSE",
        "confidence": 0.99,
        "reasoning": "The claim is false.",
        "evidence": ["Evidence 1"]
    }`
);


// Test 3: Markdown code fence
testParser(
    "Markdown JSON",
    "```json\n" +
    JSON.stringify({
        verdict: "TRUE",
        confidence: 0.9,
        reasoning: "The claim is supported.",
        evidence: ["Evidence 1"]
    }) +
    "\n```"
);


// Test 4: Extra text around JSON
testParser(
    "Extra text",
    `Here is my analysis:

    {
        "verdict": "FALSE",
        "confidence": 0.85,
        "reasoning": "The claim is contradicted.",
        "evidence": ["Evidence 1"]
    }

    That is my conclusion.`
);


// Test 5: Invalid verdict
testParser(
    "Invalid verdict",
    `{
        "verdict": "MAYBE",
        "confidence": 0.8,
        "reasoning": "Not sure.",
        "evidence": ["Evidence 1"]
    }`
);


// Test 6: Invalid confidence
testParser(
    "Invalid confidence",
    `{
        "verdict": "TRUE",
        "confidence": 5,
        "reasoning": "The claim is true.",
        "evidence": ["Evidence 1"]
    }`
);


// Test 7: Missing evidence
testParser(
    "Missing evidence",
    `{
        "verdict": "TRUE",
        "confidence": 0.9,
        "reasoning": "The claim is true."
    }`
);


// Test 8: Completely invalid response
testParser(
    "Completely invalid",
    "I don't know how to answer this."
);