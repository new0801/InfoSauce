import type { AIInput } from "./aiInput";
import type { NewsItem } from "./news";

type EvidenceItem = {
    title?: string;
    content?: string;
    source?: string;
    url?: string;
    publishedAt?: string | null;
    platform?: string;
};

export function prepareAiInput(
    newsItem: NewsItem,
    evidence: Array<string | EvidenceItem> = []
): AIInput {

    const formattedEvidence = evidence.map((item) => {

        if (typeof item === "string") {
            return item;
        }

        return (
            `Title: ${item.title || "Unknown"}\n` +
            `Source: ${item.source || "Unknown"}\n` +
            `Published: ${item.publishedAt || "Unknown"}\n` +
            `URL: ${item.url || "Unknown"}\n` +
            `Content: ${item.content || "No content provided"}`
        );
    });

    return {
        newsId: newsItem.id,

        title: newsItem.title,

        content: newsItem.content,

        claim: newsItem.title,

        sources: [
            newsItem.url,
            ...evidence
                .map(item =>
                    typeof item === "string"
                        ? null
                        : item.url
                )
                .filter(
                    (url): url is string =>
                        typeof url === "string" &&
                        url.trim() !== ""
                )
        ],

        evidence: formattedEvidence
    };
}

