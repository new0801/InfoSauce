const { askGonkaPrompt } = require("./gonka");
const { parseClaimResponse } = require("./claimparser");
const { models } = require("./models")
require("dotenv").config();;

async function extractClaim(text) {
    if (
        !text ||
        typeof text !== "string" ||
        text.trim() === ""
    ) {
        throw new Error(
            "claimExtractor.js: Text must be a non-empty string"
        );
    }

    const prompt = `
You are a neutral factual claim extraction system.

Analyze the following social media content.

Determine whether it contains a factual claim that can reasonably be verified using evidence.

A factual claim is a statement that can be evaluated as TRUE, FALSE, or UNCERTAIN.

Do NOT treat the following as factual claims:
- Opinions
- Emotions
- Personal preferences
- Questions
- Jokes
- Predictions
- Vague reactions
- Purely subjective statements

If the content contains a factual claim, extract the clearest and most specific factual claim.

Do not add information that is not present in the original content.

Return ONLY valid JSON in exactly this format:

{
  "hasClaim": true,
  "claim": "The extracted factual claim."
}

If there is no verifiable factual claim, return:

{
  "hasClaim": false,
  "claim": null
}

Social media content:
${text.trim()}
`;

    const response = await askGonkaPrompt(prompt, models[0]);

    if (
        !response ||
        !response.content ||
        !Array.isArray(response.content)
    ) {
        throw new Error(
            "claimExtractor.js: Invalid Gonka response"
        );
    }

    const textContent = response.content
        .filter(
            (item) =>
                item &&
                item.type === "text" &&
                typeof item.text === "string"
        )
        .map((item) => item.text)
        .join("");

    if (!textContent) {
        throw new Error(
            "claimExtractor.js: Gonka returned no text"
        );
    }

    return parseClaimResponse(textContent);
}

module.exports = {
    extractClaim
};