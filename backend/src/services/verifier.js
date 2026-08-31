const { askGonka } = require("./gonka");

const models = [
    "deepseek-ai/DeepSeek-V4-Flash-0731",
    //"moonshotai/Kimi-K2.6",
    "MiniMaxAI/MiniMax-M2.7"
];

async function verifyClaim(text) {

    // 1. Validate input
    if (!text || typeof text !== "string" || text.trim() === "") {
        throw new Error("Claim must be a non-empty string");
    }

    const results = [];

    // 2. Ask every model to verify the claim
    for (const model of models) {

        try {

            const result = await askGonka(text, model);
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
                throw new Error("Unexpected response from Gonka");
            }

            const responseText = result.content[0].text;
            //console.log(`\n===== ${model} RAW RESPONSE =====`);
            //console.log(responseText);
            //console.log(`===== END ${model} RESPONSE =====\n`); 

            // 4. Parse the model's JSON response
            let verificationResult;
            try {
                const jsonStart = responseText.indexOf("{");
                const jsonEnd = responseText.lastIndexOf("}");

                if (jsonStart === -1 || jsonEnd === -1) {
                    throw new Error("No JSON object found");
                }

                const jsonText = responseText.substring(
                    jsonStart,
                    jsonEnd + 1
                );

                verificationResult = JSON.parse(jsonText);

            } catch (error) {
                throw new Error("Gonka returned invalid JSON");
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

            // 5. Validate verification result
            if (
                !verificationResult ||
                typeof verificationResult.verdict !== "string" ||
                typeof verificationResult.confidence !== "number" ||
                typeof verificationResult.reasoning !== "string" ||
                !Array.isArray(verificationResult.evidence)
            ) {
                throw new Error("Invalid verification result from Gonka");
            }

            if (
                verificationResult.confidence < 0 ||
                verificationResult.confidence > 1
            ) {
                throw new Error("Confidence must be between 0 and 1");
            }

            // 6. Store this model's result
            results.push({
                model: model,
                result: verificationResult
            });

        } catch (error) {

            console.error(`Model ${model} failed:`, error);

        }
    }

    // 7. Make sure at least one model succeeded
    if (results.length === 0) {
        throw new Error("All verification models failed");
    }

    // 8. Return all successful model results
    return results;
}

module.exports = {
    verifyClaim
};