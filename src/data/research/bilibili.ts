import { runSearch, stringValue, type CommandRunner, type RawResearchItem, type ResearchSearchResult } from "./types";

export function searchBilibili(query: string, runner?: CommandRunner): Promise<ResearchSearchResult> {
  return runSearch("bilibili", "opencli", ["bilibili", "search", query, "-f", "json", "--window", "background", "--site-session", "ephemeral", "--keep-tab", "false"], (record) => {
    const title = stringValue(record.title);
    const url = stringValue(record.url);
    if (!title || !url) return null;
    const author = stringValue(record.author);
    return {
      id: url,
      title,
      content: title,
      url,
      source: author ? `${author} on Bilibili` : "Bilibili",
      sourceType: "social_media",
      publishedAt: null,
      platform: "bilibili",
      metadata: record,
    } satisfies RawResearchItem;
  }, runner);
}
