import { afterEach, describe, expect, it, vi } from "vitest";
import { getDailyArticles, replaceDailyArticle, saveDailyArticles } from "./dailyArticleStore";
import type { DailyArticle } from "./dailyTypes";

const article = (id: string, verificationStatus: DailyArticle["verificationStatus"]): DailyArticle => ({ id, area: "AI", topic: "AI", title: id, content: "content", source: "source", url: `https://example.com/${id}`, publishedAt: null, verificationStatus });

afterEach(() => vi.unstubAllGlobals());

describe("replaceDailyArticle", () => {
  it("updates only the retried article in the Daily session cache", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("window", { sessionStorage: { getItem: (key: string) => storage.get(key) || null, setItem: (key: string, value: string) => storage.set(key, value) } });
    saveDailyArticles([article("verified", "verified"), article("retry", "gonka_timeout")]);

    const updated = replaceDailyArticle(article("retry", "verified"));

    expect(updated.map((item) => item.verificationStatus)).toEqual(["verified", "verified"]);
    expect(getDailyArticles().map((item) => item.id)).toEqual(["verified", "retry"]);
  });
});
