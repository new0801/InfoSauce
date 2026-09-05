const { extractClaim } = require("./claimextractor");
const { extractPublicPage, ContentExtractionError } = require("./contentExtraction");
const { detectSocialUrl, extractSocialPost, SocialExtractionError } = require("./socialExtraction");
const { verifyExtractedClaim } = require("./claimVerificationEngine");

const unsupportedUrlHosts = ["x.com", "twitter.com", "reddit.com", "youtube.com", "youtu.be", "bilibili.com", "xiaohongshu.com", "xhslink.com"];

function isUnsupportedDirectUrl(value) {
    try {
        const host = new URL(value).hostname.toLowerCase();
        return unsupportedUrlHosts.some(domain => host === domain || host.endsWith(`.${domain}`));
    } catch {
        return false;
    }
}

function extractionFailure(error) {
    const message = error instanceof ContentExtractionError && error.code === "URL_INVALID"
        ? "The submitted URL is invalid."
        : "Unable to extract content from this URL.";
    return { success: false, stage: "content_extraction", status: "failed", message };
}

function socialExtractionFailure(error) {
    const platform = error?.platform === "x" ? "X post" : error?.platform === "reddit" ? "Reddit post" : "social post";
    const message = error instanceof SocialExtractionError && error.code === "SOCIAL_URL_INVALID"
        ? "The submitted social URL is invalid."
        : `Unable to retrieve this ${platform}.`;
    return { success: false, stage: "content_extraction", status: "failed", message };
}

async function verifyTypedInput(input, dependencies = {}) {
    const extract = dependencies.extractClaim || extractClaim;
    const extractPage = dependencies.extractPublicPage || extractPublicPage;
    const extractSocial = dependencies.extractSocialPost || extractSocialPost;
    const verify = dependencies.verifyExtractedClaim || verifyExtractedClaim;

    if (!input || typeof input !== "object") {
        return { success: false, stage: "input_validation", status: "failed", message: "Verification input is required." };
    }

    if (input.type === "image") {
        return { success: false, input: { type: "image" }, stage: "content_extraction", status: "unsupported", message: "Image text extraction is not currently supported." };
    }
    if (input.type === "url") {
        if (typeof input.content !== "string" || !input.content.trim()) return extractionFailure();
        const submittedUrl = input.content.trim();
        let socialTarget;
        try {
            socialTarget = detectSocialUrl(submittedUrl);
        } catch (error) {
            return socialExtractionFailure(error);
        }
        if (socialTarget) {
            let page;
            try {
                page = await extractSocial(submittedUrl);
            } catch (error) {
                console.warn("[CONTENT_EXTRACTION] failed", JSON.stringify({ platform: socialTarget.platform, code: error?.code || "SOCIAL_UNKNOWN_ERROR" }));
                return socialExtractionFailure(error);
            }
            return verifyExtractedContent({ type: "url", content: page.content, page }, extract, verify);
        }
        if (isUnsupportedDirectUrl(submittedUrl)) {
            return { success: false, input: { type: "url" }, stage: "content_extraction", status: "unsupported", message: "Direct URL extraction for this platform is not currently supported." };
        }

        let page;
        try {
            page = await extractPage(submittedUrl);
        } catch (error) {
            console.warn("[CONTENT_EXTRACTION] failed", JSON.stringify({ code: error?.code || "URL_UNKNOWN_ERROR" }));
            return extractionFailure(error);
        }
        return verifyExtractedContent({ type: "url", content: page.content, page }, extract, verify);
    }
    if (input.type === "text" && typeof input.content === "string" && input.content.trim()) {
        return verifyExtractedContent({ type: "text", content: input.content.trim() }, extract, verify);
    }
    return { success: false, stage: "input_validation", status: "failed", message: "Text verification requires non-empty content." };
}

async function verifyExtractedContent(input, extract, verify) {
    let extracted;
    try {
        extracted = await extract(input.content);
    } catch {
        return { success: false, input: { type: input.type }, claimStatus: "failed", stage: "claim_extraction", status: "failed", message: "Claim extraction failed." };
    }
    if (!extracted?.hasClaim || !extracted.claim?.trim()) {
        return { success: false, input: { type: input.type }, claimStatus: "not_verifiable", stage: "claim_extraction", status: "not_verifiable", message: "No verifiable factual claim was found." };
    }

    const page = input.page;
    const article = page ? {
        id: `url:${page.originalUrl}`,
        title: page.title || extracted.claim.trim(),
        content: input.content,
        source: page.source || new URL(page.resolvedUrl).hostname,
        sourceType: "news",
        url: page.originalUrl,
        canonicalUrl: page.resolvedUrl,
        originalUrl: page.originalUrl,
        platform: page.platform || "web"
    } : undefined;
    const result = await verify(extracted.claim.trim(), { content: input.content, ...(article ? { article } : {}) });
    return {
        success: result.verificationStatus === "completed",
        input: { type: input.type },
        claimStatus: "completed",
        claim: { hasClaim: true, text: extracted.claim.trim() },
        ...(page ? { contentExtraction: { originalUrl: page.originalUrl, resolvedUrl: page.resolvedUrl, title: page.title, textLength: input.content.length } } : {}),
        ...result
    };
}

module.exports = { verifyTypedInput };
