import type { AIInput } from "./aiInput";
import type { NewsItem } from "./news";

export function prepareAiInput(newsItem: NewsItem, evidence: string[] = []): AIInput {
  return {
    newsId: newsItem.id,
    title: newsItem.title,
    content: newsItem.content,
    claim: newsItem.title,
    sources: [newsItem.url],
    evidence,
  };
}
