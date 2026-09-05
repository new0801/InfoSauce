const { askGonka } = require("./gonka");

const models = [
    "deepseek-ai/DeepSeek-V4-Flash-0731",
    //"moonshotai/Kimi-K2.6",
    "MiniMaxAI/MiniMax-M2.7"
];

function parseVerificationResponse(responseText) {

    if (
        typeof responseText !== "string" ||
        responseText.trim() === ""
    ) {
        throw new Error("Model returned empty response");
    }

    let jsonText = responseText.trim();

    // 1. Remove model reasoning
    // Handles:
    // <think>reasoning...</think>
    // { JSON }
    if (jsonText.includes("</think>")) {
        jsonText = jsonText
            .split("</think>")
            .pop()
            .trim();
    }

    // 2. Remove Markdown code fences
    jsonText = jsonText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

    // 3. Extract JSON object
    const firstBrace = jsonText.indexOf("{");
    const lastBrace = jsonText.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1) {
        throw new Error("Model response does not contain a JSON object");
    }
    jsonText = jsonText.slice(
        firstBrace,
        lastBrace + 1
    );

    // 4. Parse JSON
    let verificationResult;
    try {
        verificationResult = JSON.parse(jsonText);
    } catch (error) {
        throw new Error(
            "Model returned malformed JSON"
        );
    }

    // 5. Validate structure
    if (!verificationResult || typeof verificationResult !== "object") {
        throw new Error("Model returned invalid verification object");
    }

    const allowedVerdicts = [
        "TRUE",
        "FALSE",
        "UNCERTAIN"
    ];
    if (!allowedVerdicts.includes(verificationResult.verdict)) {
        throw new Error(
            `Invalid verdict: ${verificationResult.verdict}`
        );
    }

    if (
        typeof verificationResult.confidence !== "number" ||
        !Number.isFinite(verificationResult.confidence)
    ) {
        throw new Error(
            "Confidence must be a number"
        );
    }

    if (
        verificationResult.confidence < 0 ||
        verificationResult.confidence > 1
    ) {
        throw new Error(
            "Confidence must be between 0 and 1"
        );
    }

    if (
        typeof verificationResult.reasoning !== "string"
    ) {
        throw new Error(
            "Reasoning must be a string"
        );
    }

    if (
        !Array.isArray(verificationResult.evidence)
    ) {
        throw new Error(
            "Evidence must be an array"
        );
    }

    return verificationResult;
}

async function verifyClaim(input) {

    // 1. Validate input
    if (!input || typeof input !== "object") {
        throw new Error("AI input must be an object");
    }

    if (
        !input.claim ||
        typeof input.claim !== "string" ||
        input.claim.trim() === ""
    ) {
        throw new Error("Claim must be a non-empty string");
    }

    if (!Array.isArray(input.sources)) {
        throw new Error("Sources must be an array");
    }

    if (!Array.isArray(input.evidence)) {
        throw new Error("Evidence must be an array");
    }

    const results = [];
    const failures = [];

    // 2. Ask every model to verify the claim
    for (const model of models) {

        try {

            const result = await askGonka(input, model);
            //console.log(`\n===== ${model} GONKA RESPONSE =====`);
            //console.dir(result, { depth: null });
            //console.log(`===== END ${model} RESPONSE =====\n`);

            // 3. Validate Gonka response
            if (
                !result ||
                !result.content ||
                !Array.isArray(result.content) ||
                !result.content[0] ||
                typeof result.content[0].text !== "string"
            ) {
                    console.log(`===== ${model} RAW GONKA RESPONSE =====`);
                    console.dir(result, { depth: null });
                    console.log(`===== END ${model} RAW GONKA RESPONSE =====`);

                    throw new Error("verifier.js: Unexpected response from Gonka");
            }

            const responseText = result.content[0].text;
            //console.log(`\n===== ${model} RAW RESPONSE =====`);
            //console.log(responseText);
            //console.log(`===== END ${model} RESPONSE =====\n`); 

            // 4. Parse and validate the model's response
            const verificationResult = parseVerificationResponse(
                responseText
            );

            if (
                !result ||
                typeof result.requestId !== "string" ||
                result.requestId.trim() === ""
            ) {
                throw new Error("verifier.js: Gonka response is missing a request ID");
            }

            // 5. Store this model's result
            results.push({
                model: model,
    		requestId: result.requestId,
    		messageId: result.id,
    		result: verificationResult
            });

        } catch (error) {

            console.error(`Model ${model} failed:`, error);
            failures.push({
                model: model,
                status: "failed",
                error: error.message
            });
        }
    }

    // 6. Make sure at least one model succeeded
    if (results.length === 0) {
        const error = new Error(
            "All verification models failed"
        );
        error.code = "ALL_MODELS_FAILED";
        throw error;
    }

    // 7. Return all successful model results
    return {
        results,
        failures
    };
}

module.exports = {
    verifyClaim,
};