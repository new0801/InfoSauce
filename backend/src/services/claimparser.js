function parseClaimResponse(text) {
    if (
        !text ||
        typeof text !== "string" ||
        text.trim() === ""
    ) {
        throw new Error(
            "claimParser.js: Empty response"
        );
    }

    let cleaned = text.trim();

    // Remove <think>...</think> if the model includes reasoning
    cleaned = cleaned.replace(
        /<think>[\s\S]*?<\/think>/gi,
        ""
    ).trim();

    // Remove markdown code fences
    cleaned = cleaned
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

    // Extract the JSON object
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
        throw new Error(
            "claimParser.js: No valid JSON object found"
        );
    }

    const jsonText = cleaned.slice(start, end + 1);

    let parsed;

    try {
        parsed = JSON.parse(jsonText);
    } catch (error) {
        throw new Error(
            "claimParser.js: Invalid JSON returned by Gonka"
        );
    }

    // Validate hasClaim
    if (typeof parsed.hasClaim !== "boolean") {
        throw new Error(
            "claimParser.js: hasClaim must be a boolean"
        );
    }

    // Validate claim
    if (
        parsed.hasClaim === true &&
        (
            typeof parsed.claim !== "string" ||
            parsed.claim.trim() === ""
        )
    ) {
        throw new Error(
            "claimParser.js: A valid claim is required when hasClaim is true"
        );
    }

    if (
        parsed.hasClaim === false &&
        parsed.claim !== null
    ) {
        throw new Error(
            "claimParser.js: claim must be null when hasClaim is false"
        );
    }

    return {
        hasClaim: parsed.hasClaim,
        claim: parsed.hasClaim
            ? parsed.claim.trim()
            : null
    };
}

module.exports = {
    parseClaimResponse
};