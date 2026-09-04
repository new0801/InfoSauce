import { describe, expect, it } from "vitest";

import { categorizeNews } from "./categorizeNews";
import { normalizeRawResearchItem } from "./normalizeNews";
import { prepareAiInput } from "./prepareAiInput";
import { searchExa } from "./research/exa";
import type { RawResearchItem } from "./research/types";

const rawItem: RawResearchItem = {
  id: "2093515564786540695",
  title: "OpenAI calls for stronger cyber defenses",
  content: "OpenAI and other organizations called for a global cyber-defense effort.",
  url: "https://x.com/i/status/2093515564786540695",
  source: "OpenAI on X",
  sourceType: "social_media",
  publishedAt: "2026-08-27T20:32:29.000Z",
  platform: "twitter",
};

describe("Day 4 research pipeline", () => {
  it("normalizes, categorizes, and prepares an AI input without losing source fields", () => {
    const normalized = normalizeRawResearchItem(rawItem);

    expect(normalized.ok).toBe(true);
    if (!normalized.ok) return;

    expect(normalized.item.title).toBe(rawItem.title);
    expect(normalized.item.content).toBe(rawItem.content);
    expect(normalized.item.url).toBe(rawItem.url);
    expect(normalized.item.source).toBe(rawItem.source);
    expect(normalized.item.sourceType).toBe("social_media");
    expect(normalized.item.area).toBe("AI & Technology");
    expect(normalized.item.topic).toBe("Cybersecurity");

    const aiInput = prepareAiInput(normalized.item);

    expect(aiInput.sources).toEqual([rawItem.url]);
    expect(aiInput.newsId).toBe(normalized.item.id);
    expect(aiInput.claim).toBe(rawItem.title);
    expect(aiInput.evidence).toEqual([]);
  });

  it("uses an existing default category when no keyword matches", () => {
    const category = categorizeNews(
      "Unrelated announcement",
      "A short neutral update.",
    );

    expect(category.area).toBe("World & Local");
    expect(category.topic).toBe("International News");
  });

  it("returns a safe error instead of a NewsItem for missing required source data", () => {
    const result = normalizeRawResearchItem({
      ...rawItem,
      title: "",
      url: "not-a-url",
    });

    expect(result).toEqual({
      ok: false,
      errors: [
        "title is required",
        "url must be an absolute http(s) URL",
      ],
    });
  });

  it("requests JSON output from mcporter before parsing Exa results", async () => {
    let receivedArgs: string[] = [];

    const result = await searchExa(
      "OpenAI official news",
      async (_command, args) => {
        receivedArgs = args;

        return {
          stdout: JSON.stringify({
            content: [
              {
                type: "text",
                text: "Title: OpenAI News\nURL: https://openai.com/news/\nPublished: N/A\nAuthor: N/A\nHighlights:\nOpenAI News | OpenAI",
              },
            ],
          }),
          stderr: "",
        };
      },
    );

    expect(receivedArgs.slice(-2)).toEqual(["--output", "json"]);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.url).toBe("https://openai.com/news/");
  });
});