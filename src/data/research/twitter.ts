import { optionalDate, runSearch, stringValue, type CommandRunner, type RawResearchItem, type ResearchSearchResult } from "./types";

export function searchTwitter(query: string, runner?: CommandRunner): Promise<ResearchSearchResult> {
  return runSearch("twitter", "opencli", ["twitter", "search", query, "-f", "json"], (record) => {
    const title = stringValue(record.text);
    const url = stringValue(record.url);
    if (!title || !url) return null;
    const author = stringValue(record.author);
    return {
      id: stringValue(record.id) || url,
      title,
      content: title,
      url,
      source: author ? `${author} on X` : "X",
      sourceType: "social_media",
      publishedAt: optionalDate(record.created_at),
      platform: "twitter",
      metadata: record,
    } satisfies RawResearchItem;
  }, runner);
}
