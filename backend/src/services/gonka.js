//Communicate with Gonka Router.
async function askGonka(claim, model) {
    //console.log("Loaded Key:", process.env.GONKA_API_KEY ? "EXISTS" : "UNDEFINED");
    try {
        const response = await fetch(
            "https://api.gonkarouter.io/v1/messages",
            {
                method: "POST",

                headers: {
                    "x-api-key": process.env.GONKA_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    model: model,
                    max_tokens: 2048,
                    messages: [
    {
        role: "user",
        content: `
You are an objective fact-checking AI.

Your task is to evaluate the following claim.

Do NOT assume that the claim is true or false.
Analyze it objectively based on your knowledge and the information provided.

Determine whether the claim is:

- TRUE
- FALSE
- UNCERTAIN

TRUE means the claim is supported by reliable evidence.

FALSE means the claim is contradicted by reliable evidence.

UNCERTAIN means there is insufficient or conflicting information to confidently determine whether the claim is true or false.

You must provide:
1. A verdict
2. A confidence score between 0 and 1
3. A concise explanation of your reasoning
4. The key evidence supporting your conclusion

Return ONLY valid JSON in exactly this format:

{
    "verdict": "TRUE",
    "confidence": 0.95,
    "reasoning": "Explain why the claim is true, false, or uncertain.",
    "evidence": [
        "Evidence point 1",
        "Evidence point 2"
    ]
}

Do not include Markdown.
Do not include code fences.
Do not include any text outside the JSON object.

Claim to verify:

${claim}
`
    }
]
                })
            }
        );

        if (!response.ok) {
            throw new Error(
                `Gonka API error: ${response.status}`
            );
        }

        const data = await response.json();

        return data;

    } catch (error) {
        console.error("Gonka request failed:", error);
        throw error;
    }
}

module.exports = {
    askGonka
};