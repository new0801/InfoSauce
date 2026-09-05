import { afterEach, describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

afterEach(() => {
  vi.unstubAllGlobals();
  delete require.cache[require.resolve("./evidence")];
});

describe("retrieveEvidence", () => {
  it("excludes the original source from cached and Exa candidates while retaining a different post on the same domain", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        evidence: [
          { title: "Original Exa result", content: "Self evidence", source: "Exa", url: "https://x.com/i/status/2095804434731413541?utm_source=exa", platform: "exa" },
          { title: "Independent X post", content: "Independent evidence", source: "Exa", url: "https://x.com/i/status/2095056302670279045", platform: "exa" },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { retrieveEvidence } = require("./evidence");

    const result = await retrieveEvidence("Visual General Intelligence was released", {
      article: { id: "twitter:2095804434731413541", url: "https://x.com/i/status/2095804434731413541", canonicalUrl: "https://twitter.com/i/status/2095804434731413541" },
      articles: [
        { id: "twitter:2095804434731413541", title: "Visual General Intelligence was released", content: "Original post", source: "X", url: "https://x.com/i/status/2095804434731413541", platform: "twitter" },
      ],
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result.evidence).toEqual([
      expect.objectContaining({ title: "Independent X post", url: "https://x.com/i/status/2095056302670279045" }),
    ]);
  });

  it("merges strongly relevant cached evidence with Exa evidence", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ evidence: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { retrieveEvidence } = require("./evidence");

    const result = await retrieveEvidence("OpenAI released an API safety report", {
      articles: [
        { title: "OpenAI releases API safety report", content: "The report includes 20 measured findings.", source: "OpenAI", url: "https://example.com/openai", platform: "twitter" },
        { title: "Football score", content: "A match ended today.", source: "Sports", url: "https://example.com/sports", platform: "exa" },
      ],
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result.evidence).toEqual([expect.objectContaining({ title: "OpenAI releases API safety report" })]);
  });

  it("keeps Exa candidates ahead of supplemental cached articles when the candidate pool is bounded", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        evidence: [
          { title: "Independent Nixon record", content: "Nixon discussed a four-day workweek in 1956.", source: "Newspaper archive", url: "https://example.com/nixon", platform: "exa" },
          { title: "Independent historical analysis", content: "Historical context for the four-day workweek.", source: "Archive", url: "https://example.com/history", platform: "exa" },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { retrieveEvidence } = require("./evidence");
    const cachedArticles = Array.from({ length: 12 }, (_, index) => ({
      title: `Technology workers report ${index}`,
      content: "Workers discussed productivity and technology gains in a modern post.",
      source: "Social",
      url: `https://example.com/social-${index}`,
      platform: "twitter",
    }));

    const result = await retrieveEvidence("Workers discussed productivity and technology gains", {
      articles: cachedArticles,
    });

    expect(result.evidence).toHaveLength(10);
    expect(result.evidence.slice(0, 2).map((item) => item.title)).toEqual([
      "Independent Nixon record",
      "Independent historical analysis",
    ]);
  });
});
