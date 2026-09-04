import { optionalDate, runSearch, stringValue, type CommandRunner, type RawResearchItem, type ResearchSearchResult } from "./types";

export function searchXhs(query: string, runner?: CommandRunner): Promise<ResearchSearchResult> {
  return runSearch("xhs", "opencli", ["xiaohongshu", "search", query, "-f", "json"], (record) => {
    const title = stringValue(record.title) || stringValue(record.desc);
    const content = stringValue(record.desc) || stringValue(record.content) || title;
    const url = stringValue(record.url) || stringValue(record.note_url);
    if (!title || !url) return null;
    return {
      id: stringValue(record.id) || stringValue(record.note_id) || url,
      title,
      content,
      url,
      source: stringValue(record.author) || stringValue(record.user_name) || "Xiaohongshu",
      sourceType: "social_media",
      publishedAt: optionalDate(record.published_at) || optionalDate(record.time),
      platform: "xhs",
      metadata: record,
    } satisfies RawResearchItem;
  }, runner);
}
