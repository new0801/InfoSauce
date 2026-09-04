import {
  isRecord,
  optionalDate,
  parseJsonRecords,
  runLocalCommand,
  stringValue,
  type CommandRunner,
  type RawResearchItem,
  type ResearchSearchResult,
} from "./types";

export async function searchExa(query: string, runner: CommandRunner = runLocalCommand): Promise<ResearchSearchResult> {
  try {
    const { stdout } = await runner("mcporter", [
      "call",
      "exa.web_search_exa",
      `query=${query}`,
      "numResults=10",
      "--output",
      "json",
    ]);
    const structuredItems = parseJsonRecords(stdout).map(toRawExaItem).filter(isRawResearchItem);
    const items = structuredItems.length > 0 ? structuredItems : parseExaContentBlocks(stdout);
    return { platform: "exa", items };
  } catch (error) {
    return {
      platform: "exa",
      items: [],
      unavailable: error instanceof Error ? error.message : "The Exa integration command failed.",
    };
  }
}

function toRawExaItem(record: Record<string, unknown>): RawResearchItem | null {
  const title = stringValue(record.title);
  const url = stringValue(record.url);
  if (!title || !url) return null;
  return {
    id: stringValue(record.id) || url,
    title,
    content: stringValue(record.text) || stringValue(record.content) || title,
    url,
    source: stringValue(record.author) || "Exa web search",
    sourceType: "news",
    publishedAt: optionalDate(record.publishedDate) || optionalDate(record.published_at),
    platform: "exa",
    metadata: record,
  };
}

function isRawResearchItem(item: RawResearchItem | null): item is RawResearchItem {
  return item !== null;
}

function parseExaContentBlocks(stdout: string): RawResearchItem[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    return [];
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.content)) return [];

  return parsed.content.flatMap((block) => {
    if (!isRecord(block) || stringValue(block.type) !== "text") return [];
    return parseExaText(stringValue(block.text));
  });
}

function parseExaText(text: string): RawResearchItem[] {
  const entries = text.split(/(?=^Title: )/m).filter((entry) => entry.startsWith("Title: "));
  return entries.flatMap((entry) => {
    const title = entry.match(/^Title: (.+)$/m)?.[1]?.trim() || "";
    const url = entry.match(/^URL: (.+)$/m)?.[1]?.trim() || "";
    const publishedAt = entry.match(/^Published: (.+)$/m)?.[1]?.trim() || "";
    const author = entry.match(/^Author: (.+)$/m)?.[1]?.trim() || "";
    const highlights = entry.match(/^Highlights:\n([\s\S]*)$/m)?.[1]?.trim() || title;
    if (!title || !url) return [];
    return [{
      id: url,
      title,
      content: highlights,
      url,
      source: author && author !== "N/A" ? author : "Exa web search",
      sourceType: "news",
      publishedAt: publishedAt && publishedAt !== "N/A" ? publishedAt : null,
      platform: "exa",
      metadata: { format: "mcporter-content-text" },
    }];
  });
}
