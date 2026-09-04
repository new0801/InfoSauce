import { categorizeNews } from "./categorizeNews";
import type { NewsItem } from "./news";
import type { RawResearchItem } from "./research/types";

export type NormalizeResult =
  | { ok: true; item: NewsItem }
  | { ok: false; errors: string[] };

export function normalizeRawResearchItem(raw: RawResearchItem): NormalizeResult {
  const errors: string[] = [];
  if (!raw.title.trim()) errors.push("title is required");
  if (!raw.content.trim()) errors.push("content is required");
  if (!raw.source.trim()) errors.push("source is required");
  if (!isHttpUrl(raw.url)) errors.push("url must be an absolute http(s) URL");
  if (errors.length > 0) return { ok: false, errors };

  const category = categorizeNews(raw.title, raw.content);
  return {
    ok: true,
    item: {
      id: `${raw.platform}:${raw.id}`,
      title: raw.title,
      content: raw.content,
      area: category.area,
      topic: category.topic,
      source: raw.source,
      sourceType: raw.sourceType,
      url: raw.url,
      publishedAt: raw.publishedAt,
    },
  };
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
