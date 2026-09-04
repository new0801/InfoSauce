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
    candidateCount
) {
    if (
        typeof responseText !== "string" ||
        responseText.trim() === ""
    ) {
        throw new Error(
            "evidenceSelector.js: Model returned empty response"
        );
    }

    let cleaned =
        responseText.trim();

    // Remove model reasoning.
    cleaned = cleaned
        .replace(
            /<think>[\s\S]*?<\/think>/gi,
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

    // Find JSON object.
    const start =
        cleaned.indexOf("{");

    const end =
        cleaned.lastIndexOf("}");

    if (
        start === -1 ||
        end === -1 ||
        end <= start
    ) {
        throw new Error(
            "evidenceSelector.js: No valid JSON object found"
        );
    }

    const jsonText =
        cleaned.slice(
            start,
            end + 1
        );

    let parsed;

    try {
        parsed =
            JSON.parse(jsonText);
    } catch (error) {
        throw new Error(
            "evidenceSelector.js: Model returned malformed JSON"
        );
    }

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

    /*
     * Keep only valid integer indexes that
     * actually exist in the candidate set.
     */
    const selectedEvidence =
        parsed.selectedEvidence.filter(
            index =>
                Number.isInteger(index) &&
                index >= 0 &&
                index < candidateCount
        );

    /*
     * Remove duplicate indexes while
     * preserving their original order.
     */
    return {
        selectedEvidence: [
            ...new Set(
                selectedEvidence
            )
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
Published: ${candidate.publishedAt || "Not provided"}
Platform: ${candidate.platform || "Not provided"}
URL: ${candidate.url || "Not provided"}
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
            candidates.length
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