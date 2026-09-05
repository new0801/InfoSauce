import { describe, expect, it, vi } from "vitest";
import { buildDailyResponse, selectMostUsefulPerPlatform } from "./daily";

describe("selectMostUsefulPerPlatform", () => {
  it("selects no more than one most useful article from each platform", () => {
    const selected = selectMostUsefulPerPlatform([
      { id: "twitter:old", platform: "twitter", title: "OpenAI API safety report", content: "A 2026 report measured 100 API safety evaluations.", sourceType: "social_media", publishedAt: "2026-09-01T00:00:00.000Z" },
      { id: "twitter:new", platform: "twitter", title: "Amazing AI", content: "This is exciting.", sourceType: "social_media", publishedAt: "2026-09-03T00:00:00.000Z" },
      { id: "exa:one", platform: "exa", publishedAt: "2026-09-02T00:00:00.000Z" },
      { id: "reddit:one", platform: "reddit", publishedAt: null },
    ], "OpenAI API safety");

    expect(selected.map((item) => item.id)).toEqual([
      "twitter:old",
      "exa:one",
      "reddit:one",
    ]);
  });
});

describe("buildDailyResponse", () => {
  it("returns one verified candidate per platform while preserving complete research by platform", async () => {
    const verifyArticle = vi.fn(async (article) => ({ ...article, factCheckable: true }));
    const result = await buildDailyResponse({
      query: "AI",
      news: [
        { id: "twitter:old", platform: "twitter", publishedAt: "2026-09-01" },
        { id: "twitter:new", platform: "twitter", publishedAt: "2026-09-03" },
        { id: "exa:one", platform: "exa", publishedAt: "2026-09-02" },
      ],
      platformResults: [{ platform: "twitter", items: [] }, { platform: "exa", items: [] }],
      unavailablePlatforms: [{ platform: "reddit", unavailable: "Not connected" }],
    }, verifyArticle);

    expect(verifyArticle).toHaveBeenCalledTimes(2);
    expect(verifyArticle.mock.calls.map(([article]) => article.id)).toEqual(["twitter:new", "exa:one"]);
    expect(result.articles.map((article) => article.id)).toEqual(["twitter:new", "exa:one"]);
    expect(result.selectedArticleIds).toEqual(["twitter:new", "exa:one"]);
    expect(result.platformResults).toEqual([
      { platform: "twitter", items: [] },
      { platform: "exa", items: [] },
    ]);
    expect(result.unavailablePlatforms).toEqual([{ platform: "reddit", unavailable: "Not connected" }]);
  });

  it("starts only one selected article verification at a time", async () => {
    const started = [];
    const resolvers = [];
    const verifyArticle = vi.fn((article) => new Promise((resolve) => {
      started.push(article.id);
      resolvers.push(() => resolve({ ...article, factCheckable: true }));
    }));

    const response = buildDailyResponse({
      query: "OpenAI API",
      news: [
        { id: "twitter:one", platform: "twitter", title: "OpenAI API report", content: "A report has 20 details.", sourceType: "social_media" },
        { id: "reddit:one", platform: "reddit", title: "OpenAI API update", content: "A release includes 10 facts.", sourceType: "social_media" },
      ],
      platformResults: [],
      unavailablePlatforms: [],
    }, verifyArticle);

    await Promise.resolve();
    expect(started).toEqual(["twitter:one"]);
    resolvers.shift()();
    await Promise.resolve();
    expect(started).toEqual(["twitter:one", "reddit:one"]);
    resolvers.forEach(resolve => resolve());
    await expect(response).resolves.toMatchObject({ selectedArticleIds: ["twitter:one", "reddit:one"] });
  });

  it("queues each selected article verification until the previous pipeline finishes", async () => {
    const started = [];
    const resolvers = [];
    const verifyArticle = vi.fn((article) => new Promise((resolve) => {
      started.push(article.id);
      resolvers.push(() => resolve({ ...article, factCheckable: true }));
    }));

    const response = buildDailyResponse({
      query: "OpenAI API",
      news: [
        { id: "twitter:one", platform: "twitter", title: "OpenAI API report", content: "A report has 20 details.", sourceType: "social_media" },
        { id: "reddit:one", platform: "reddit", title: "OpenAI API update", content: "A release includes 10 facts.", sourceType: "social_media" },
        { id: "exa:one", platform: "exa", title: "OpenAI API news", content: "A report contains 10 findings.", sourceType: "news" },
      ],
      platformResults: [],
      unavailablePlatforms: [],
    }, verifyArticle);

    await Promise.resolve();
    expect(started).toEqual(["twitter:one"]);
    resolvers.shift()();
    await Promise.resolve();
    expect(started).toEqual(["twitter:one", "reddit:one"]);
    resolvers.shift()();
    await Promise.resolve();
    expect(started).toEqual(["twitter:one", "reddit:one", "exa:one"]);
    resolvers.forEach(resolve => resolve());
    await response;
  });

  it("keeps successful platforms when one verification times out", async () => {
    const result = await buildDailyResponse({
      query: "OpenAI API",
      news: [
        { id: "twitter:one", platform: "twitter", title: "OpenAI API report", content: "A report has 20 details.", sourceType: "social_media" },
        { id: "reddit:one", platform: "reddit", title: "OpenAI API update", content: "A release includes 10 facts.", sourceType: "social_media" },
      ],
      platformResults: [],
      unavailablePlatforms: [],
    }, async (article) => {
      if (article.platform === "reddit") throw new Error("Gonka request timed out");
      return { ...article, factCheckable: true };
    });

    expect(result.articles).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "twitter:one", factCheckable: true }),
      expect.objectContaining({ id: "reddit:one", factCheckable: false, verificationUnavailable: "Gonka request timed out" }),
    ]));
  });

  it("preserves a Gonka HTTP failure instead of labelling it as a timeout", async () => {
    const failure = new Error("Gonka API error: 502");
    failure.code = "GONKA_HTTP_ERROR";
    const result = await buildDailyResponse({
      query: "OpenAI API",
      news: [{ id: "twitter:one", platform: "twitter", title: "OpenAI API report", content: "A report has 20 details.", sourceType: "social_media" }],
      platformResults: [],
      unavailablePlatforms: [],
    }, async () => { throw failure; });

    expect(result.articles[0]).toMatchObject({
      verificationStatus: "gonka_http_error",
      verificationUnavailable: "Gonka API error: 502",
    });
  });
});
