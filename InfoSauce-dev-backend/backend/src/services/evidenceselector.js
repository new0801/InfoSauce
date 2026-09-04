const { askGonkaPrompt } = require("./gonka");
const { models } = require("./models");

const MAX_CANDIDATES = 10;
const MAX_CONTENT_LENGTH = 700;

function validateInputs(claim, evidence) {
    if (
        !claim ||
        typeof claim !== "string" ||
        claim.trim() === ""
    ) {
        throw new Error(
            "evidenceSelector.js: Claim must be a non-empty string"
        );
    }

    if (!Array.isArray(evidence)) {
        throw new Error(
            "evidenceSelector.js: Evidence must be an array"
        );
    }
}

function prepareCandidates(evidence) {
    return evidence
        .slice(0, MAX_CANDIDATES)
        .map((item, index) => ({
            index,

            title:
                typeof item.title === "string"
                    ? item.title.trim()
                    : "",

            content:
                typeof item.content === "string"
                    ? item.content
                        .trim()
                        .slice(0, MAX_CONTENT_LENGTH)
                    : "",

            source:
                typeof item.source === "string"
                    ? item.source.trim()
                    : "",

            url:
                typeof item.url === "string"
                    ? item.url.trim()
                    : "",

            publishedAt:
                item.publishedAt || null,

            platform:
                item.platform || null
        }));
}

function parseSelectionResponse(
    responseText,
    candidateCount,
    stopReason = null
) {
    if (
        typeof responseText !== "string" ||
        responseText.trim() === ""
    ) {
        throw new Error(
            "evidenceSelector.js: Model returned empty response"
        );
    }

    let cleaned = responseText.trim();

    // Remove model reasoning.
    cleaned = cleaned
        .replace(
            /<think>[\s\S]*?<\/think>/gi,
            ""
        )
        .trim();

    // Remove Markdown code fences.
    cleaned = cleaned
        .replace(
            /^```json\s*/i,
            ""
        )
        .replace(
            /^```\s*/i,
            ""
        )
        .replace(
            /\s*```$/i,
            ""
        )
        .trim();

    console.log(
        ">>> CLEANED SELECTION RESPONSE:"
    );

    console.log(cleaned);

    console.log(
        ">>> END CLEANED RESPONSE"
    );

    // Find JSON object.
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    /*
     * Normal case:
     *
     * {
     *   "selectedEvidence": [5, 9]
     * }
     */
    if (
        start !== -1 &&
        end !== -1 &&
        end > start
    ) {
        const jsonText = cleaned.slice(
            start,
            end + 1
        );

        try {
            const parsed = JSON.parse(jsonText);

            if (
                !parsed ||
                typeof parsed !== "object" ||
                Array.isArray(parsed)
            ) {
                throw new Error(
                    "evidenceSelector.js: Invalid selection object"
                );
            }

            if (
                !Array.isArray(
                    parsed.selectedEvidence
                )
            ) {
                throw new Error(
                    "evidenceSelector.js: selectedEvidence must be an array"
                );
            }

            const selectedEvidence =
                parsed.selectedEvidence.filter(
                    index =>
                        Number.isInteger(index) &&
                        index >= 0 &&
                        index < candidateCount
                );

            return {
                selectedEvidence: [
                    ...new Set(
                        selectedEvidence
                    )
                ]
            };

        } catch (error) {

            /*
             * JSON exists, but it is malformed.
             *
             * If the model was stopped because it hit
             * max_tokens, try conservative recovery.
             */
            if (
                stopReason === "max_tokens"
            ) {
                const recovered =
                    recoverTruncatedSelection(
                        cleaned,
                        candidateCount
                    );

                if (recovered) {
                    return recovered;
                }
            }

            throw new Error(
                "evidenceSelector.js: Model returned malformed JSON"
            );
        }
    }

    /*
     * No complete JSON object was found.
     *
     * Only attempt recovery when Gonka explicitly
     * says the model hit max_tokens.
     */
    if (
        stopReason === "max_tokens"
    ) {
        const recovered =
            recoverTruncatedSelection(
                cleaned,
                candidateCount
            );

        if (recovered) {
            return recovered;
        }
    }

    throw new Error(
        "evidenceSelector.js: Model response did not contain a complete JSON object"
    );
}

function recoverTruncatedSelection(
    text,
    candidateCount
) {
    if (
        typeof text !== "string" ||
        text.trim() === ""
    ) {
        return null;
    }

    /*
     * We ONLY recover the exact indexes that are
     * completely present in the model's response.
     *
     * Example:
     *
     * {"selectedEvidence":[5,9
     *
     * becomes:
     *
     * {"selectedEvidence":[5,9]}
     *
     * because 5 and 9 are both complete integers.
     */

    const match =
        text.match(
            /"selectedEvidence"\s*:\s*\[([^\]]*)/
        );

    if (!match) {
        return null;
    }

    const contents = match[1].trim();

    /*
     * Empty array:
     *
     * {"selectedEvidence":[
     *
     * We can safely interpret this as an empty
     * selection only if the model had actually
     * started the selectedEvidence array.
     */
    if (contents === "") {
        return {
            selectedEvidence: []
        };
    }

    if (contents.endsWith(",")) {
        return null;
    }

    /*
     * Split on commas.
     */
    const parts = contents
        .split(",")
        .map(part => part.trim());

    const indexes = [];

    for (const part of parts) {

        /*
         * Only accept a complete integer.
         *
         * Safe:
         * 5
         * 9
         *
         * Unsafe:
         * 5.
         * 5e
         * -
         * 1abc
         */
        if (!/^-?\d+$/.test(part)) {
            return null;
        }

        const index = Number(part);

        if (
            !Number.isInteger(index) ||
            index < 0 ||
            index >= candidateCount
        ) {
            return null;
        }

        indexes.push(index);
    }

    return {
        selectedEvidence: [
            ...new Set(indexes)
        ]
    };
}

async function selectEvidenceForModel(
    claim,
    candidates,
    model
) {
    const formattedCandidates =
    candidates
        .map(candidate => {
            return `
Evidence ${candidate.index}:
Title: ${candidate.title || "Not provided"}
Source: ${candidate.source || "Not provided"}
Content: ${candidate.content || "Not provided"}
`;
        })
        .join("\n");

    const prompt = `
You are a neutral evidence selection system for a factual claim verification system.

Your task is to identify which candidate evidence items are genuinely relevant to the claim.

Do NOT determine whether the claim is TRUE or FALSE.

Select only evidence that is directly relevant to verifying the claim.

Ignore unrelated evidence.

You must select evidence only from the candidate list provided below.

Do not use outside knowledge.
Do not invent evidence.
Do not explain your decision.
Do not provide analysis.
Do not provide commentary.
Do not use <think> tags.

Return ONLY this JSON object:

{
  "selectedEvidence": [0, 3, 7]
}

The numbers must correspond exactly to the Evidence indexes provided below.

If none of the evidence is relevant, return:

{
  "selectedEvidence": []
}

Claim:
${claim.trim()}

Candidate evidence:
${formattedCandidates}
`;

    const response =
        await askGonkaPrompt(
            prompt,
            model,
            1024
        );

    if (
        !response ||
        !Array.isArray(
            response.content
        )
    ) {
        throw new Error(
            "evidenceSelector.js: Invalid Gonka response"
        );
    }

    const responseText =
        response.content
            .filter(
                item =>
                    item &&
                    item.type === "text" &&
                    typeof item.text ===
                        "string"
            )
            .map(
                item => item.text
            )
            .join("");

    console.log(
        `===== RAW EVIDENCE SELECTION RESPONSE: ${model} =====`
    );

    console.log(responseText);

    console.log(
        "======================================================"
    );

    if (!responseText) {
        throw new Error(
            "evidenceSelector.js: Gonka returned no text"
        );
    }

    const selection =
        parseSelectionResponse(
            responseText,
            candidates.length,
            response.stop_reason
        );

    return {
        model,
        selectedEvidence:
            selection.selectedEvidence
    };
}

async function selectEvidence(
    claim,
    evidence
) {
    validateInputs(
        claim,
        evidence
    );

    const candidates =
        prepareCandidates(
            evidence
        );

    if (
        candidates.length === 0
    ) {
        return {
            candidates: [],
            results: [],
            failures: []
        };
    }

    /*
     * Evidence selection intentionally
     * uses only the first configured model.
     *
     * models[0] is currently:
     * deepseek-ai/DeepSeek-V4-Flash-0731
     *
     * MiniMax is not used for evidence
     * selection because it has repeatedly
     * failed to return reliable structured
     * JSON for this task.
     */
    const evidenceSelectionModel =
        models[0];

    if (
        typeof evidenceSelectionModel !==
            "string" ||
        evidenceSelectionModel.trim() === ""
    ) {
        return {
            candidates,
            results: [],
            failures: [
                {
                    model:
                        evidenceSelectionModel ||
                        "unknown",
                    status: "failed",
                    error:
                        "No evidence selection model is configured"
                }
            ]
        };
    }

    const results = [];
    const failures = [];

    try {

        const result =
            await selectEvidenceForModel(
                claim,
                candidates,
                evidenceSelectionModel
            );

        results.push(
            result
        );

    } catch (error) {

        console.error(
            `Evidence selection failed for ${evidenceSelectionModel}:`,
            error
        );

        failures.push({
            model:
                evidenceSelectionModel,

            status:
                "failed",

            error:
                error.message
        });
    }

    return {
        candidates,
        results,
        failures
    };
}

module.exports = {
    selectEvidence
};