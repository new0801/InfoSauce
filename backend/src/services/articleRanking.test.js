import { describe, expect, it } from "vitest";
import { selectMostUsefulPerPlatform } from "./articleRanking";

describe("selectMostUsefulPerPlatform", () => {
  it("selects the more relevant and specific article instead of the newest article", () => {
    const selected = selectMostUsefulPerPlatform([
      {
        id: "twitter:newest",
        platform: "twitter",
        title: "Amazing AI tools",
        content: "This is exciting.",
        source: "Unknown account",
        sourceType: "social_media",
        publishedAt: "2026-09-05T00:00:00.000Z",
      },
      {
        id: "twitter:useful",
        platform: "twitter",
        title: "OpenAI publishes API safety evaluation results",
        content: "OpenAI published a 2026 report covering 1,000 API safety evaluations and the measured results.",
        source: "OpenAI on X",
        sourceType: "social_media",
        publishedAt: "2026-09-01T00:00:00.000Z",
      },
    ], "OpenAI API safety");

    expect(selected.map((article) => article.id)).toEqual(["twitter:useful"]);
  });

  it("keeps at most one best candidate for each platform", () => {
    const selected = selectMostUsefulPerPlatform([
      { id: "reddit:one", platform: "reddit", title: "OpenAI update", content: "OpenAI released version 2.", source: "r/AI", sourceType: "social_media", publishedAt: null },
      { id: "reddit:two", platform: "reddit", title: "OpenAI API report", content: "The report gives 20 specific API findings.", source: "r/AI", sourceType: "social_media", publishedAt: null },
      { id: "exa:one", platform: "exa", title: "OpenAI API news", content: "A detailed report explains the API release.", source: "News", sourceType: "news", publishedAt: null },
    ], "OpenAI API");

    expect(selected.map((article) => article.platform)).toEqual(["reddit", "exa"]);
    expect(selected.map((article) => article.id)).toEqual(["reddit:two", "exa:one"]);
  });
});
