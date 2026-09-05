import { runSearch, stringValue, unixDate, type CommandRunner, type RawResearchItem, type ResearchSearchResult } from "./types";

export function searchReddit(query: string, runner?: CommandRunner): Promise<ResearchSearchResult> {
  return runSearch("reddit", "opencli", ["reddit", "search", query, "-f", "json", "--window", "background", "--site-session", "ephemeral", "--keep-tab", "false"], (record) => {
    const title = stringValue(record.title);
    const url = stringValue(record.url);
    if (!title || !url) return null;
    const subreddit = stringValue(record.subreddit);
    const author = stringValue(record.author);
    return {
      id: stringValue(record.id) || url,
      title,
      content: stringValue(record.selftext) || title,
      url,
      source: [subreddit, author ? `u/${author}` : ""].filter(Boolean).join(" · ") || "Reddit",
      sourceType: "social_media",
      publishedAt: unixDate(record.created_utc),
      platform: "reddit",
      metadata: record,
    } satisfies RawResearchItem;
  }, runner);
}
