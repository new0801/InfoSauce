import { describe, expect, it } from "vitest";
import { isRetryableDailyVerification, prioritizeDailyArticles } from "./dailyVerification";
import type { DailyArticle } from "./dailyTypes";

function article(id: string, verificationStatus: DailyArticle["verificationStatus"], truthScore?: number): DailyArticle {
  return { id, area: "AI", topic: "AI", title: id, content: "content", source: "source", url: `https://example.com/${id}`, publishedAt: null, verificationStatus, truthScore: truthScore === undefined ? undefined : { truthScore } };
}

describe("Daily verification presentation", () => {
  it("treats temporary Gonka failures as retryable but not unsupported content", () => {
    expect(isRetryableDailyVerification(article("timeout", "gonka_timeout"))).toBe(true);
    expect(isRetryableDailyVerification(article("auth", "gonka_auth_error"))).toBe(false);
    expect(isRetryableDailyVerification(article("no-claim", "not_verifiable"))).toBe(false);
  });

  it("places both completed TRUE and completed FALSE fact-checks ahead of timeouts", () => {
    const ordered = prioritizeDailyArticles([
      article("timeout", "gonka_timeout"),
      article("true", "verified", 95),
      article("false", "verified", 8),
    ]);

    expect(ordered.map((item) => item.id)).toEqual(["true", "false", "timeout"]);
  });

  it("keeps the existing order stable within each verification group", () => {
    const ordered = prioritizeDailyArticles([
      article("timeout-first", "gonka_timeout"),
      article("verified-first", "verified"),
      article("timeout-second", "gonka_network_error"),
      article("verified-second", "verified"),
    ]);

    expect(ordered.map((item) => item.id)).toEqual(["verified-first", "verified-second", "timeout-first", "timeout-second"]);
  });

  it("moves a successfully retried article into the completed group", () => {
    const ordered = prioritizeDailyArticles([
      article("already-verified", "verified"),
      article("retried", "verified"),
      article("still-timeout", "gonka_timeout"),
    ]);

    expect(ordered.map((item) => item.id)).toEqual(["already-verified", "retried", "still-timeout"]);
  });
});
