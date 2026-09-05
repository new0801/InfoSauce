//Communicate with Gonka Router.
async function askGonka(input, model) {

    const MAX_RETRIES = 1;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {

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
You are an objective, neutral, and rigorous fact-checking AI.

Your task is to independently evaluate the factual accuracy of the claim provided below.

IMPORTANT PRINCIPLES:

1. DO NOT assume the claim is true.
2. DO NOT assume the claim is false.
3. Do not agree with the claim merely because it sounds plausible.
4. Do not reject the claim merely because it conflicts with common beliefs.
5. Base your conclusion on factual evidence and logical reasoning.
6. Clearly distinguish established facts from assumptions, speculation, and uncertainty.
7. If the available information is insufficient to determine the truth, return UNCERTAIN rather than guessing.
8. Consider whether the claim depends on a specific date, location, person, event, or changing real-world condition.
9. Be especially cautious with claims about current events or real-time conditions because your knowledge may not contain the latest information.
10. Do not fabricate sources, studies, quotations, statistics, URLs, or evidence.

VERDICT DEFINITIONS:

TRUE:
The claim is supported by reliable factual evidence and there is no significant contradictory evidence.

FALSE:
The claim is contradicted by reliable factual evidence or contains a materially false assertion.

UNCERTAIN:
There is insufficient reliable evidence to confidently classify the claim as TRUE or FALSE, or reliable evidence is significantly conflicting.

FACT-CHECKING PROCESS:

Step 1:
Identify the central factual claim being made.

Step 2:
Determine what facts would need to be true for the claim to be correct.

Step 3:
Evaluate the available evidence relevant to the claim.

Step 4:
Look for evidence that contradicts the claim.

Step 5:
Consider important context, dates, definitions, and limitations.

Step 6:
Determine the most appropriate verdict.

Step 7:
Assign a confidence score between 0 and 1 based on the strength and consistency of the evidence.

CONFIDENCE GUIDELINES:

0.90 - 1.00:
Very strong evidence with little or no credible contradiction.

0.75 - 0.89:
Strong evidence, but some limitations or minor uncertainty exist.

0.50 - 0.74:
Mixed, incomplete, or moderately uncertain evidence.

0.25 - 0.49:
Weak evidence or substantial uncertainty.

0.00 - 0.24:
Very little reliable evidence.

EVIDENCE REQUIREMENTS:

Provide 2-5 concise evidence points.

Each evidence point must directly support or contradict the claim.

Do not invent evidence.

If you do not have enough reliable evidence, explicitly say so.

REASONING REQUIREMENTS:

Explain briefly why the evidence leads to the selected verdict.

Do not simply repeat the claim.

Do not use emotional, political, or persuasive language.

Return ONLY valid JSON.

The sources and evidence below are provided as candidate information for verification.

Do NOT automatically assume that any provided source or evidence is correct.

Evaluate whether the evidence actually supports or contradicts the claim.

If the evidence is insufficient, unreliable, or conflicting, return UNCERTAIN.

Do not treat the original post's claims as evidence merely because they appear in the content.

Return exactly this structure:

{
  "verdict": "TRUE",
  "confidence": 0.95,
  "reasoning": "Explain how the available evidence supports or contradicts the claim.",
  "evidence": [
    {
      "evidenceIndex": 0,
      "support": "Explain how this specific evidence supports or contradicts the claim."
    },
    {
      "evidenceIndex": 1,
      "support": "Explain how this specific evidence supports or contradicts the claim."
    }
  ]
}

EVIDENCE FORMAT REQUIREMENT:

The "evidence" field MUST contain objects.

Each object MUST contain exactly these important fields:

- "evidenceIndex": the integer index of the supplied evidence being referenced.
- "support": a concise explanation of how that specific evidence supports or contradicts the claim.

Do NOT return evidence as a list of numbers.

Do NOT return:
"evidence": [0, 1]

Do NOT return:
"evidence": ["Evidence point 1", "Evidence point 2"]

Do NOT return evidence objects without "support".

The evidenceIndex MUST refer only to evidence that was actually supplied below.

Use the evidenceIndex shown in the supplied Evidence section.

If no supplied evidence supports or contradicts the claim, return:
"evidence": []

Do not include Markdown.
Do not include code fences.
Do not include <think> tags.
Do not include any text outside the JSON object.

Claim to verify:

${input.claim}

Original title:

${input.title || "Not provided"}

Original content:

${input.content || "Not provided"}

Sources:

${input.sources.length > 0
    ? input.sources.join("\n")
    : "No sources provided"}

Evidence:

${input.evidence.length > 0
    ? input.evidence.map((item, index) => `
Evidence Index: ${index}
Title: ${item.title || "Not provided"}
Content: ${item.content || "Not provided"}
Source: ${item.source || "Not provided"}
URL: ${item.url || "Not provided"}
`).join("\n")
    : "No evidence provided"}
`
                            }
                        ]
                    })
                }
            );

            if (!response.ok) {
                throw new Error(
                    `gonka.js: Gonka API error: ${response.status}`
                );
            }

            const data = await response.json();

            return data;

        } catch (error) {

            // Final attempt failed
            if (attempt === MAX_RETRIES) {

                console.error(
                    "gonka.js: Gonka request failed after retry:",
                    error
                );

                throw error;
            }

            // First attempt failed → retry once
            console.log(
                `gonka.js: Request failed for ${model}. Retrying in 2 seconds...`
            );

            await new Promise(
                resolve => setTimeout(resolve, 2000)
            );
        }
    }
}

async function askGonkaPrompt(prompt, model, maxTokens = 1024) {
    return askGonkaMessageContent(prompt, model, maxTokens);
}

async function askGonkaMessageContent(content, model, maxTokens = 1024) {
    const MAX_RETRIES = 1;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
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
                        max_tokens: maxTokens,
                        messages: [
                            {
                                role: "user",
                                content
                            }
                        ]
                    })
                }
            );

            if (!response.ok) {
                throw new Error(
                    `gonka.js: Gonka API error: ${response.status}`
                );
            }

            const data = await response.json();

            return data;

        } catch (error) {

            // If this was the final attempt, give up.
            if (attempt === MAX_RETRIES) {
                console.error(
                    "gonka.js: Gonka prompt request failed after retry:",
                    error
                );

                throw error;
            }

            // Wait 2 seconds before retrying.
            console.log(
                `gonka.js: Request failed for ${model}. Retrying in 2 seconds...`
            );

            await new Promise(
                resolve => setTimeout(resolve, 2000)
            );
        }
    }
}

module.exports = {
    askGonka,
    askGonkaPrompt,
    askGonkaMessageContent
};
