import { describe, expect, it } from "vitest";
import { toEvidenceSources } from "./evidenceSources";

describe("toEvidenceSources", () => {
  it("preserves structured API evidence fields without fabricating missing metadata", () => {
    expect(toEvidenceSources([
      { title: "Article", source: "Example News", url: "https://example.com/article", publishedAt: "2026-09-05" },
      { source: "Source only", url: null, publishedAt: null },
    ])).toEqual([
      { title: "Article", source: "Example News", url: "https://example.com/article", publishedAt: "2026-09-05" },
      { source: "Source only" },
    ]);
  });
});
