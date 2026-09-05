import { describe, expect, it, vi } from "vitest";
import { retryDailyArticle } from "./dailyRetry";

const timedOutArticle = {
  id: "twitter:timeout",
  title: "Article title",
  content: "Article content",
  claim: "A factual claim",
  platform: "twitter",
  verificationStatus: "gonka_timeout",
  evidence: [{ title: "Independent evidence", content: "Evidence content", source: "Example", url: "https://example.com/evidence" }],
  truthScore: { truthScore: 99 },
};

const completedVerification = {
  results: [{ model: "DeepSeek", requestId: "req-retry", result: { verdict: "TRUE", confidence: 0.9, reasoning: "Supported", evidence: [] } }],
  failures: [],
};

function dependencies(overrides = {}) {
  return {
    prepareAiInput: vi.fn().mockReturnValue({ claim: "old claim", evidence: [] }),
    verifyClaim: vi.fn().mockResolvedValue(completedVerification),
    calculateConsensus: vi.fn().mockReturnValue({ verdict: "TRUE" }),
    calculateTruthScore: vi.fn().mockReturnValue({ truthScore: 90, verdict: "TRUE" }),
    verifyDailyArticle: vi.fn(),
    ...overrides,
  };
}

describe("retryDailyArticle", () => {
  it("reuses saved claim and selected evidence for a Gonka-only timeout retry", async () => {
    const services = dependencies();

    const result = await retryDailyArticle(timedOutArticle, services);

    expect(services.prepareAiInput).toHaveBeenCalledWith(expect.objectContaining({ id: "twitter:timeout" }), timedOutArticle.evidence);
    expect(services.verifyClaim).toHaveBeenCalledWith(expect.objectContaining({ claim: "A factual claim", evidence: timedOutArticle.evidence }));
    expect(services.verifyDailyArticle).not.toHaveBeenCalled();
    expect(result).toMatchObject({ verificationStatus: "verified", claim: "A factual claim", consensus: { verdict: "TRUE" }, truthScore: { truthScore: 90 } });
  });

  it("does not retain a frontend-provided verdict or Truth Score", async () => {
    const services = dependencies({
      calculateConsensus: vi.fn().mockReturnValue({ verdict: "FALSE" }),
      calculateTruthScore: vi.fn().mockReturnValue({ truthScore: 7, verdict: "FALSE" }),
    });

    const result = await retryDailyArticle(timedOutArticle, services);

    expect(result.consensus).toEqual({ verdict: "FALSE" });
    expect(result.truthScore).toEqual({ truthScore: 7, verdict: "FALSE" });
  });

  it("falls back to single-article verification only when saved evidence is missing", async () => {
    const fallbackResult = { ...timedOutArticle, verificationStatus: "verified", claim: "A newly extracted claim" };
    const services = dependencies({ verifyDailyArticle: vi.fn().mockResolvedValue(fallbackResult) });

    const result = await retryDailyArticle({ ...timedOutArticle, evidence: [] }, services);

    expect(services.verifyDailyArticle).toHaveBeenCalledWith(expect.objectContaining({ id: "twitter:timeout" }));
    expect(services.verifyClaim).not.toHaveBeenCalled();
    expect(result).toBe(fallbackResult);
  });

  it("keeps a failed Gonka retry retryable without exposing the provider error", async () => {
    const services = dependencies({ verifyClaim: vi.fn().mockRejectedValue(Object.assign(new Error("provider secret failure"), { code: "GONKA_TIMEOUT" })) });

    const result = await retryDailyArticle(timedOutArticle, services);

    expect(result).toMatchObject({ verificationStatus: "gonka_timeout", verificationUnavailable: "Verification timed out. Try again." });
    expect(result.verificationUnavailable).not.toContain("secret");
  });
});
