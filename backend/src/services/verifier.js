const { askGonka } = require("./gonka");
const { models, configuredModelCount } = require("./models");

function parseVerificationResponse(
    responseText,
    evidenceCount
) {
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

    if (
        firstBrace === -1 ||
        lastBrace === -1 ||
        lastBrace <= firstBrace
    ) {
        throw new Error(
            "Model response does not contain a JSON object"
        );
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
    if (
        !verificationResult ||
        typeof verificationResult !== "object" ||
        Array.isArray(verificationResult)
    ) {
        throw new Error(
            "Model returned invalid verification object"
        );
    }

    // 6. Validate verdict
    const allowedVerdicts = [
        "TRUE",
        "FALSE",
        "UNCERTAIN"
    ];

    if (
        !allowedVerdicts.includes(
            verificationResult.verdict
        )
    ) {
        throw new Error(
            `Invalid verdict: ${verificationResult.verdict}`
        );
    }

    // 7. Validate confidence
    if (
        typeof verificationResult.confidence !== "number" ||
        !Number.isFinite(
            verificationResult.confidence
        )
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

    // 8. Validate reasoning
    if (
        typeof verificationResult.reasoning !== "string" ||
        verificationResult.reasoning.trim() === ""
    ) {
        throw new Error(
            "Reasoning must be a non-empty string"
        );
    }

    // 9. Validate evidence
    if (
        !Array.isArray(
            verificationResult.evidence
        )
    ) {
        throw new Error(
            "Evidence must be an array"
        );
    }

    /*
     * Each evidence item must reference evidence
     * that was actually supplied to the model.
     *
     * Expected format:
     *
     * {
     *   "evidenceIndex": 1,
     *   "support": "This evidence supports..."
     * }
     */

    const validatedEvidence = [];

    for (
        const item of verificationResult.evidence
    ) {
        if (
            !item ||
            typeof item !== "object" ||
            Array.isArray(item)
        ) {
            throw new Error(
                "Each evidence item must be an object"
            );
        }

        if (
            !Number.isInteger(
                item.evidenceIndex
            )
        ) {
            throw new Error(
                "Evidence item must contain an integer evidenceIndex"
            );
        }

        if (
            item.evidenceIndex < 0 ||
            item.evidenceIndex >= evidenceCount
        ) {
            throw new Error(
                `Evidence index ${item.evidenceIndex} is out of range`
            );
        }

        if (
            typeof item.support !== "string" ||
            item.support.trim() === ""
        ) {
            throw new Error(
                "Evidence support must be a non-empty string"
            );
        }

        validatedEvidence.push({
            evidenceIndex: item.evidenceIndex,
            support: item.support.trim()
        });
    }

    // Remove duplicate evidence references.
    const seenIndexes = new Set();

    const uniqueEvidence =
        validatedEvidence.filter(item => {
            if (
                seenIndexes.has(
                    item.evidenceIndex
                )
            ) {
                return false;
            }

            seenIndexes.add(
                item.evidenceIndex
            );

            return true;
        });

    return {
        verdict:
            verificationResult.verdict,

        confidence:
            verificationResult.confidence,

        reasoning:
            verificationResult.reasoning.trim(),

        evidence:
            uniqueEvidence
    };
}

async function verifyWithModel(input, model) {
    let requestId;
    let rawResponseChars = 0;
    const startedAt = Date.now();

    try {
        const result = await askGonka(input, model);

        requestId = typeof result?.requestId === "string" && result.requestId.trim() !== ""
            ? result.requestId
            : undefined;

        if (
            !result ||
            !Array.isArray(result.content) ||
            result.content.length === 0 ||
            !result.content[0] ||
            typeof result.content[0].text !== "string"
        ) {
            throw new Error("verifier.js: Unexpected response from Gonka");
        }

        const rawResponse = result.content[0].text;
        rawResponseChars = rawResponse.length;
        if (model.includes("MiniMax")) console.log(`[GONKA] MiniMax raw response: ${rawResponse}`);

        const verificationResult = parseVerificationResponse(
            rawResponse,
            input.evidence.length
        );

        if (typeof result.id !== "string" || result.id.trim() === "") {
            throw new Error("verifier.js: Gonka response is missing a message ID");
        }

        if (!requestId) {
            throw new Error("verifier.js: Gonka response is missing a Router request ID");
        }

        console.log(`[GONKA] parse result ${JSON.stringify({
            phase: "verification",
            model,
            requestId,
            parsing: "success",
            rawResponseChars,
            elapsedMs: Date.now() - startedAt
        })}`);

        return {
            result: {
                model,
                requestId,
                result: verificationResult
            }
        };
    } catch (error) {
        console.log(`[GONKA] parse result ${JSON.stringify({
            phase: "verification",
            model,
            requestId: requestId || null,
            parsing: "failed",
            rawResponseChars,
            elapsedMs: Date.now() - startedAt,
            failureCategory: error?.code === "GONKA_TIMEOUT"
                ? "timeout"
                : rawResponseChars > 0
                    ? "parse_failure"
                    : "request_failure"
        })}`);
        console.error(`Model ${model} failed:`, error);
        return {
            failure: {
                model,
                status: "failed",
                error: error.message,
                code: error.code || "GONKA_UNKNOWN_ERROR",
                ...(requestId ? { requestId } : {})
            }
        };
    }
}

function normalizeFailureCategory(code) {
    if (code === "GONKA_TIMEOUT") return "timeout";
    if (code === "GONKA_AUTH_ERROR") return "auth";
    if (code === "GONKA_NETWORK_ERROR") return "network";
    return "request_failure";
}

function verificationSummary(results, failures) {
    const failedModelNames = failures
        .map(failure => failure.model)
        .filter(model => typeof model === "string" && model.trim() !== "");
    const successfulModels = results.length;
    const failedModels = failures.length;
    const degraded = successfulModels < configuredModelCount || failedModels > 0;

    return {
        mode: degraded ? "degraded" : "full",
        degraded,
        successfulModels,
        configuredModels: configuredModelCount,
        failedModels,
        failedModelNames,
        failureCategories: failures.map(failure => ({
            model: failure.model,
            category: normalizeFailureCategory(failure.code)
        }))
    };
}

async function verifyClaim(input) {

    // 1. Validate input
    if (
        !input ||
        typeof input !== "object"
    ) {
        throw new Error(
            "AI input must be an object"
        );
    }

    if (
        !input.claim ||
        typeof input.claim !== "string" ||
        input.claim.trim() === ""
    ) {
        throw new Error(
            "Claim must be a non-empty string"
        );
    }

    if (
        !Array.isArray(input.sources)
    ) {
        throw new Error(
            "Sources must be an array"
        );
    }

    if (
        !Array.isArray(input.evidence)
    ) {
        throw new Error(
            "Evidence must be an array"
        );
    }

    if (input.evidence.length === 0) {
        throw new Error(
            "At least one evidence item is required"
        );
    }

    const attempts = await Promise.all(
        models.map(model => verifyWithModel(input, model))
    );
    const results = attempts.flatMap(attempt => attempt.result ? [attempt.result] : []);
    const failures = attempts.flatMap(attempt => attempt.failure ? [attempt.failure] : []);

    // 7. Require at least one successful model
    if (results.length === 0) {

        const error = new Error(
            "All verification models failed"
        );

        const failureCodes = [...new Set(failures.map(failure => failure.code))];
        error.code = failureCodes.length === 1 && failureCodes[0] !== "GONKA_UNKNOWN_ERROR"
            ? failureCodes[0]
            : "ALL_MODELS_FAILED";

        throw error;
    }

    // 8. Return successful results + failures
    return {
        results,
        failures,
        ...verificationSummary(results, failures)
    };
}

module.exports = {
    verifyClaim,
    configuredModelCount
};

