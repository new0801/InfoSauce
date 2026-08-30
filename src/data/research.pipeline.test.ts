import assert from "node:assert/strict";
import test from "node:test";

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

test("normalizes, categorizes, and prepares an AI input without losing source fields", () => {
  const normalized = normalizeRawResearchItem(rawItem);

  assert.equal(normalized.ok, true);
  if (!normalized.ok) return;

  assert.equal(normalized.item.title, rawItem.title);
  assert.equal(normalized.item.content, rawItem.content);
  assert.equal(normalized.item.url, rawItem.url);
  assert.equal(normalized.item.source, rawItem.source);
  assert.equal(normalized.item.sourceType, "social_media");
  assert.equal(normalized.item.area, "AI & Technology");
  assert.equal(normalized.item.topic, "Cybersecurity");

  const aiInput = prepareAiInput(normalized.item);
  assert.deepEqual(aiInput.sources, [rawItem.url]);
  assert.equal(aiInput.newsId, normalized.item.id);
  assert.equal(aiInput.claim, rawItem.title);
  assert.deepEqual(aiInput.evidence, []);
});

test("uses an existing default category when no keyword matches", () => {
  const category = categorizeNews("Unrelated announcement", "A short neutral update.");

  assert.equal(category.area, "World & Local");
  assert.equal(category.topic, "International News");
});

test("returns a safe error instead of a NewsItem for missing required source data", () => {
  const result = normalizeRawResearchItem({ ...rawItem, title: "", url: "not-a-url" });

  assert.deepEqual(result, {
    ok: false,
    errors: ["title is required", "url must be an absolute http(s) URL"],
  });
});

test("requests JSON output from mcporter before parsing Exa results", async () => {
  let receivedArgs: string[] = [];
  const result = await searchExa("OpenAI official news", async (_command, args) => {
    receivedArgs = args;
    return {
      stdout: JSON.stringify({
        content: [{
          type: "text",
          text: "Title: OpenAI News\nURL: https://openai.com/news/\nPublished: N/A\nAuthor: N/A\nHighlights:\nOpenAI News | OpenAI",
        }],
      }),
      stderr: "",
    };
  });

  assert.deepEqual(receivedArgs.slice(-2), ["--output", "json"]);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0]?.url, "https://openai.com/news/");
});
