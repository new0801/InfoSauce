import { optionalDate, runSearch, stringValue, type CommandRunner, type RawResearchItem, type ResearchSearchResult } from "./types";

export function searchYouTube(query: string, runner?: CommandRunner): Promise<ResearchSearchResult> {
  return runSearch("youtube", "opencli", ["youtube", "search", query, "-f", "json", "--window", "background", "--site-session", "ephemeral", "--keep-tab", "false"], (record) => {
    const title = stringValue(record.title);
    const url = stringValue(record.url);
    if (!title || !url) return null;
    const channel = stringValue(record.channel);
    return {
      id: url,
      title,
      content: title,
      url,
      source: channel ? `${channel} on YouTube` : "YouTube",
      sourceType: "social_media",
      publishedAt: optionalDate(record.published),
      platform: "youtube",
      metadata: record,
    } satisfies RawResearchItem;
  }, runner);
}
