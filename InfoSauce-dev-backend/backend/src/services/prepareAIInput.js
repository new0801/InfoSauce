function prepareAiInput(newsItem, evidence = []) {
    if (
        !newsItem ||
        typeof newsItem !== "object"
    ) {
        throw new Error(
            "prepareAiInput: News item is required"
        );
    }

    if (
        !newsItem.title ||
        typeof newsItem.title !== "string" ||
        newsItem.title.trim() === ""
    ) {
        throw new Error(
            "prepareAiInput: News item title is required"
        );
    }

    if (
        !newsItem.content ||
        typeof newsItem.content !== "string" ||
        newsItem.content.trim() === ""
    ) {
        throw new Error(
            "prepareAiInput: News item content is required"
        );
    }

    if (!Array.isArray(evidence)) {
        throw new Error(
            "prepareAiInput: Evidence must be an array"
        );
    }

    /*
     * Normalize the original news URL.
     *
     * Some data sources may return a Markdown-style
     * link instead of a plain URL.
     */
    const sourceUrl =
        typeof newsItem.url === "string" &&
        newsItem.url.trim() !== ""
            ? newsItem.url.trim()
            : null;

    /*
     * Preserve every selected evidence item's identity.
     *
     * The array position becomes the stable evidenceIndex
     * used by the final verification models.
     *
     * Example:
     *
     * Evidence 0:
     * ...
     *
     * Evidence 1:
     * ...
     *
     * The verifier must reference these indexes when
     * explaining which evidence supports or contradicts
     * the claim.
     */
    const formattedEvidence =
        evidence.map(
            (item, index) => {

                // String evidence is still supported.
                if (
                    typeof item === "string"
                ) {
                    return {
                        evidenceIndex: index,
                        text: item.trim()
                    };
                }

                if (
                    !item ||
                    typeof item !== "object"
                ) {
                    return {
                        evidenceIndex: index,
                        text:
                            "No usable evidence content provided"
                    };
                }

                const title =
                    typeof item.title ===
                        "string"
                        ? item.title.trim()
                        : "Unknown";

                const source =
                    typeof item.source ===
                        "string"
                        ? item.source.trim()
                        : "Unknown";

                const publishedAt =
                    item.publishedAt ||
                    "Unknown";

                const url =
                    typeof item.url ===
                        "string"
                        ? item.url.trim()
                        : "Unknown";

                const platform =
                    typeof item.platform ===
                        "string"
                        ? item.platform.trim()
                        : "Unknown";

                const content =
                    typeof item.content ===
                        "string"
                        ? item.content.trim()
                        : "No content provided";

                return {
                    evidenceIndex: index,

                    title,

                    source,

                    publishedAt,

                    platform,

                    url,

                    content
                };
            }
        );

    /*
     * Collect the URLs from the selected evidence.
     *
     * These are kept separately from the structured evidence
     * because they are useful as source links for the frontend.
     */
    const evidenceSources =
        evidence
            .map(
                item =>
                    typeof item === "object" &&
                    item !== null &&
                    typeof item.url ===
                        "string"
                        ? item.url.trim()
                        : null
            )
            .filter(
                url =>
                    typeof url ===
                        "string" &&
                    url !== ""
            );

    /*
     * Keep the original post/news URL separate
     * from the evidence URLs conceptually.
     *
     * The final API layer can expose these as:
     *
     * Original source
     * Evidence sources
     * Verification trace
     */
    const sources = [
        ...(sourceUrl
            ? [sourceUrl]
            : []),

        ...evidenceSources
    ];

    return {
        newsId:
            newsItem.id || null,

        title:
            newsItem.title.trim(),

        content:
            newsItem.content.trim(),

        /*
         * The route will replace this with the actual
         * extracted factual claim before verification.
         *
         * Keeping the field here maintains compatibility
         * with the existing verifier input contract.
         */
        claim:
            newsItem.title.trim(),

        sources,

        evidence:
            formattedEvidence
    };
}

module.exports = {
    prepareAiInput
};

