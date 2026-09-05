// Communicate with Gonka Router.
const DEFAULT_RETRY_DELAY_MS = 2000;
const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
const MINIMAX_REQUEST_TIMEOUT_MS = 30_000;
const DEFAULT_VERIFICATION_MAX_TOKENS = 1024;
const MINIMAX_VERIFICATION_MAX_TOKENS = 2048;

function isMiniMaxModel(model) {
    return typeof model === "string" && model.includes("MiniMax");
}

function verificationRequestSettings(model, options = {}) {
    const miniMax = isMiniMaxModel(model);
    return {
        maxTokens: miniMax
            ? MINIMAX_VERIFICATION_MAX_TOKENS
            : DEFAULT_VERIFICATION_MAX_TOKENS,
        timeoutMs: options.timeoutMs || (miniMax
            ? MINIMAX_REQUEST_TIMEOUT_MS
            : DEFAULT_REQUEST_TIMEOUT_MS)
    };
}

function getRetryDelayMs(response) {
    const retryAfter = response.headers?.get?.("retry-after");

    if (!retryAfter) {
        return DEFAULT_RETRY_DELAY_MS;
    }

    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) {
        return seconds * 1000;
    }

    const retryAt = Date.parse(retryAfter);
    return Number.isNaN(retryAt)
        ? DEFAULT_RETRY_DELAY_MS
        : Math.max(0, retryAt - Date.now());
}

function createGonkaError(response) {
    const error = new Error(
        `gonka.js: Gonka API error: ${response.status}`
    );

    if (response.status === 429) {
        error.retryDelayMs = getRetryDelayMs(response);
    }

    error.status = response.status;
    error.code = response.status === 401 || response.status === 403
        ? "GONKA_AUTH_ERROR"
        : "GONKA_HTTP_ERROR";

    return error;
}

function getRetryDelayForError(error) {
    return Number.isFinite(error.retryDelayMs)
        ? error.retryDelayMs
        : DEFAULT_RETRY_DELAY_MS;
}

function isRetryableGonkaError(error) {
    return Number.isFinite(error?.retryDelayMs) ||
        error?.code === "GONKA_TIMEOUT";
}

function toTimeoutError(error) {
    const message = String(error?.message || "").toLowerCase();
    if (error?.name !== "TimeoutError" && !message.includes("timeout") && !message.includes("aborted")) {
        if (error?.code) {
            return error;
        }

        const networkError = new Error(error?.message || "Gonka network request failed");
        networkError.code = "GONKA_NETWORK_ERROR";
        return networkError;
    }

    const timeoutError = new Error("Gonka request timed out");
    timeoutError.code = "GONKA_TIMEOUT";
    return timeoutError;
}

// Temporary integration diagnostics. Never log request content, headers, or secrets.
function logGonka(event, details = {}) {
    console.log(`[GONKA] ${event} ${JSON.stringify(details)}`);
}

function requestSignal(timeoutMs) {
    return AbortSignal.timeout(timeoutMs || DEFAULT_REQUEST_TIMEOUT_MS);
}

function attachRouterRequestId(data, response) {
    return {
        ...data,
        requestId:
            response.headers?.get?.("x-request-id") ||
            null
    };
}

async function askGonka(input, model, options = {}) {

    const MAX_RETRIES = 1;
    const settings = verificationRequestSettings(model, options);

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const startedAt = Date.now();

        try {

            logGonka("request started", {
                phase: "verification",
                model,
                attempt: attempt + 1,
                maxTokens: settings.maxTokens,
                timeoutMs: settings.timeoutMs
            });

            const response = await fetch(
                "https://api.gonkarouter.io/v1/messages",
                {
                    method: "POST",

                    headers: {
                        "x-api-key": process.env.GONKA_API_KEY,
                        "anthropic-version": "2023-06-01",
                        "Content-Type": "application/json"
                    },

                    signal: requestSignal(settings.timeoutMs),
                    body: JSON.stringify({
                        model: model,
                        max_tokens: settings.maxTokens,
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
Do not output <think> tags, analysis, or Markdown code fences.

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
                logGonka("response received", { phase: "verification", model, attempt: attempt + 1, httpStatus: response.status });
                throw createGonkaError(response);
            }

            const data = await response.json();
            const result = attachRouterRequestId(
                data,
                response
            );
            const rawResponse = Array.isArray(result.content)
                ? result.content
                    .filter(item => typeof item?.text === "string")
                    .map(item => item.text)
                    .join("")
                : "";
            logGonka("final result received", {
                phase: "verification",
                model,
                attempt: attempt + 1,
                httpStatus: response.status,
                requestId: result.requestId,
                messageId: typeof result.id === "string" ? result.id : null,
                stopReason: result.stop_reason || result.stopReason || null,
                outputTokens: result.usage?.output_tokens || result.usage?.outputTokens || null,
                rawResponseChars: rawResponse.length,
                elapsedMs: Date.now() - startedAt
            });
            return result;

        } catch (error) {
            const requestError = toTimeoutError(error);
            logGonka("request failed", {
                phase: "verification",
                model,
                attempt: attempt + 1,
                code: requestError.code || "GONKA_UNKNOWN_ERROR",
                httpStatus: requestError.status || null,
                failureCategory: requestError.code === "GONKA_TIMEOUT" ? "timeout" : "request_failure",
                elapsedMs: Date.now() - startedAt
            });

            // Final attempt failed
            if (attempt === MAX_RETRIES || !isRetryableGonkaError(requestError)) {

                console.error(
                    "gonka.js: Gonka request failed after retry:",
                    requestError
                );

                throw requestError;
            }

            // First attempt failed → retry once
            const retryDelayMs = getRetryDelayForError(requestError);
            console.log(
                `gonka.js: Request failed for ${model}. Retrying in ${retryDelayMs / 1000} seconds...`
            );
            logGonka("retry scheduled", { phase: "verification", model, attempt: attempt + 1, retryDelayMs });

            await new Promise(
                resolve => setTimeout(resolve, retryDelayMs)
            );
        }
    }
}

async function askGonkaPrompt(prompt, model, maxTokens = 2048, options = {}) {
    const MAX_RETRIES = 1;
    const phase = options.phase || "prompt";

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const startedAt = Date.now();

        try {
            logGonka("request started", { phase, model, attempt: attempt + 1, maxTokens, promptChars: prompt.length });
            const response = await fetch(
                "https://api.gonkarouter.io/v1/messages",
                {
                    method: "POST",

                    headers: {
                        "x-api-key": process.env.GONKA_API_KEY,
                        "anthropic-version": "2023-06-01",
                        "Content-Type": "application/json"
                    },

                    signal: requestSignal(options.timeoutMs),
                    body: JSON.stringify({
                        model: model,
                        max_tokens: maxTokens,
                        messages: [
                            {
                                role: "user",
                                content: prompt
                            }
                        ]
                    })
                }
            );

            if (!response.ok) {
                logGonka("response received", { phase, model, attempt: attempt + 1, httpStatus: response.status });
                throw createGonkaError(response);
            }

            const data = await response.json();
            const rawResponse = Array.isArray(data.content)
                ? data.content
                    .filter(item => typeof item?.text === "string")
                    .map(item => item.text)
                    .join("")
                : "";
            logGonka("final result received", {
                phase,
                model,
                attempt: attempt + 1,
                httpStatus: response.status,
                requestId: response.headers?.get?.("x-request-id") || null,
                messageId: typeof data.id === "string" ? data.id : null,
                stopReason: data.stop_reason || data.stopReason || null,
                outputTokens: data.usage?.output_tokens || data.usage?.outputTokens || null,
                rawResponseChars: rawResponse.length,
                elapsedMs: Date.now() - startedAt
            });
            return data;

        } catch (error) {
            const requestError = toTimeoutError(error);
            logGonka("request failed", {
                phase,
                model,
                attempt: attempt + 1,
                code: requestError.code || "GONKA_UNKNOWN_ERROR",
                httpStatus: requestError.status || null,
                failureCategory: requestError.code === "GONKA_TIMEOUT" ? "timeout" : "request_failure",
                elapsedMs: Date.now() - startedAt
            });

            // If this was the final attempt, give up.
            if (attempt === MAX_RETRIES || !isRetryableGonkaError(requestError)) {
                console.error(
                    "gonka.js: Gonka prompt request failed after retry:",
                    requestError
                );

                throw requestError;
            }

            // Wait 2 seconds before retrying.
            const retryDelayMs = getRetryDelayForError(requestError);
            console.log(
                `gonka.js: Request failed for ${model}. Retrying in ${retryDelayMs / 1000} seconds...`
            );
            logGonka("retry scheduled", { phase, model, attempt: attempt + 1, retryDelayMs });

            await new Promise(
                resolve => setTimeout(resolve, retryDelayMs)
            );
        }
    }
}

module.exports = {
    askGonka,
    askGonkaPrompt
};
