import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  defaultTrendingNews,
  toDefaultVerificationInput,
} from "./defaultTrending";

describe("defaultTrendingNews", () => {
  it("provides five complete articles for the initial Trending view", () => {
    expect(defaultTrendingNews).toHaveLength(5);

    for (const article of defaultTrendingNews) {
      expect(article.title).not.toBe("");
      expect(article.summary).not.toBe("");
      expect(article.content).not.toBe("");
      expect(article.source).not.toBe("");
      expect(article.href).toMatch(/^https?:\/\//);
      expect(article.factCheck.result).toBe("verified");
    }

    expect(defaultTrendingNews.map((article) => article.category)).toEqual([
      "AI & Technology",
      "K-pop & Entertainment",
      "World & Local",
      "Business & Lifestyle",
      "Sport & Gaming",
    ]);
  });

  it("converts a default article into the existing verification contract", () => {
    const article = defaultTrendingNews[0];

    expect(toDefaultVerificationInput(article)).toEqual({
      claim: article.summary,
      title: article.title,
      content: article.content,
      sources: [`${article.source}: ${article.href}`],
      evidence: [
        {
          title: article.title,
          content: article.content,
          url: article.href,
          source: article.source,
          platform: article.platform,
          publishedAt: article.publishedAt,
        },
      ],
    });
  });

  it("does not let the homepage replace saved defaults through the category API", () => {
    const homepage = readFileSync(
      new URL("../app/page.tsx", import.meta.url),
      "utf8",
    );

    expect(homepage).not.toContain("/api/integration/category");
    expect(homepage).not.toContain("fetchCategoryResults");
  });
});
