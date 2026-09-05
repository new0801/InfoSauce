import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyDailyArticle } from "./dailyPipeline";

afterEach(() => {
  vi.useRealTimers();
});

describe("verifyDailyArticle", () => {
  it("runs the existing claim, evidence selection, and verifier services for one article", async () => {
    const evidence = [{ title: "Evidence", content: "Supports claim", source: "Source", url: "https://example.com/evidence" }];
    const dependencies = {
      extractClaim: vi.fn().mockResolvedValue({ hasClaim: true, claim: "A factual claim" }),
      retrieveEvidence: vi.fn().mockResolvedValue({ evidence }),
      selectEvidence: vi.fn().mockResolvedValue({ results: [{ selectedEvidence: [0] }] }),
      prepareAiInput: vi.fn().mockReturnValue({ claim: "Original claim", sources: [], evidence: [] }),
      verifyClaim: vi.fn().mockResolvedValue({ results: [{ model: "model", requestId: "req-1", result: { verdict: "TRUE", confidence: 0.9, reasoning: "Supported", evidence: [] } }], failures: [] }),
      calculateConsensus: vi.fn().mockReturnValue({ verdict: "TRUE" }),
      calculateTruthScore: vi.fn().mockReturnValue({ truthScore: 90 }),
    };

    const result = await verifyDailyArticle(
      { id: "twitter:1", title: "Article", content: "Article content", url: "https://example.com/article", platform: "twitter" },
      dependencies,
    );

    expect(dependencies.extractClaim).toHaveBeenCalledWith("Article content");
    expect(dependencies.selectEvidence).toHaveBeenCalledWith("A factual claim", evidence);
    expect(dependencies.verifyClaim).toHaveBeenCalledWith(expect.objectContaining({ claim: "A factual claim" }));
    expect(result).toEqual(expect.objectContaining({
      id: "twitter:1",
      claim: "A factual claim",
      headline: "A factual claim",
      evidenceStatus: "available",
      verificationStatus: "verified",
      evidence,
      consensus: { verdict: "TRUE" },
      truthScore: { truthScore: 90 },
    }));
    expect(result.verificationTrace).toEqual(expect.arrayContaining([
      expect.objectContaining({ stage: "claim_extraction", status: "succeeded" }),
      expect.objectContaining({ stage: "evidence_retrieval", status: "succeeded" }),
      expect.objectContaining({ stage: "evidence_selection", status: "succeeded" }),
      expect.objectContaining({ stage: "gonka_verification", status: "succeeded", requestIds: ["req-1"] }),
    ]));
  });

  it("does not call evidence selection or Gonka verification when no factual claim exists", async () => {
    const dependencies = {
      extractClaim: vi.fn().mockResolvedValue({ hasClaim: false, claim: null }),
      retrieveEvidence: vi.fn(),
      selectEvidence: vi.fn(),
      prepareAiInput: vi.fn(),
      verifyClaim: vi.fn(),
      calculateConsensus: vi.fn(),
      calculateTruthScore: vi.fn(),
    };

    const result = await verifyDailyArticle(
      { id: "youtube:1", title: "Opinion", content: "This is exciting!", platform: "youtube" },
      dependencies,
    );

    expect(result).toEqual(expect.objectContaining({
      factCheckable: false,
      evidenceStatus: "not_applicable",
      verificationStatus: "not_verifiable",
      verificationUnavailable: "No verifiable factual claim was found.",
    }));
    expect(result.verificationTrace).toEqual(expect.arrayContaining([
      expect.objectContaining({ stage: "claim_extraction", status: "not_verifiable" }),
      expect.objectContaining({ stage: "evidence_retrieval", status: "not_applicable" }),
      expect.objectContaining({ stage: "gonka_verification", status: "not_applicable" }),
    ]));
    expect(dependencies.retrieveEvidence).not.toHaveBeenCalled();
    expect(dependencies.selectEvidence).not.toHaveBeenCalled();
    expect(dependencies.verifyClaim).not.toHaveBeenCalled();
  });

  it("reports a Gonka selection timeout without pretending that final verification ran", async () => {
    const selectionTimeout = Object.assign(new Error("Gonka request timed out"), { code: "GONKA_TIMEOUT" });
    const dependencies = {
      extractClaim: vi.fn().mockResolvedValue({ hasClaim: true, claim: "A factual claim" }),
      retrieveEvidence: vi.fn().mockResolvedValue({ evidence: [{ title: "Evidence", content: "Supports claim" }] }),
      selectEvidence: vi.fn().mockRejectedValue(selectionTimeout),
      prepareAiInput: vi.fn(),
      verifyClaim: vi.fn(),
      calculateConsensus: vi.fn(),
      calculateTruthScore: vi.fn(),
    };

    await expect(verifyDailyArticle({ id: "reddit:timeout", title: "Article", content: "A factual claim" }, dependencies)).resolves.toMatchObject({
      verificationStatus: "gonka_timeout",
      evidenceStatus: "timeout",
      verificationTrace: expect.arrayContaining([
        expect.objectContaining({ stage: "evidence_selection", status: "failed", code: "GONKA_TIMEOUT" }),
        expect.objectContaining({ stage: "gonka_verification", status: "not_applicable", pollAttempts: 0 }),
      ]),
    });
    expect(dependencies.verifyClaim).not.toHaveBeenCalled();
  });

  it("uses an article-supported fallback for a Chinese amount headline when Gonka claim extraction returns no claim", async () => {
    const evidence = [{ title: "Evidence", content: "Supports the reported amount", source: "Source", url: "https://example.com/evidence" }];
    const dependencies = {
      extractClaim: vi.fn().mockResolvedValue({ hasClaim: false, claim: null }),
      retrieveEvidence: vi.fn().mockResolvedValue({ evidence }),
      selectEvidence: vi.fn().mockResolvedValue({ results: [{ selectedEvidence: [0] }] }),
      prepareAiInput: vi.fn().mockReturnValue({ sources: [], evidence: [] }),
      verifyClaim: vi.fn().mockResolvedValue({ results: [{ model: "model", requestId: "req-cn-amount", result: { verdict: "TRUE", confidence: 0.9, reasoning: "Supported", evidence: [] } }], failures: [] }),
      calculateConsensus: vi.fn().mockReturnValue({ verdict: "TRUE" }),
      calculateTruthScore: vi.fn().mockReturnValue({ truthScore: 90 }),
    };

    const title = "英伟达 129 亿 Hugging Face，OpenAI 抢发 GPT-6 Astra";
    const result = await verifyDailyArticle({ id: "bilibili:amount", title, content: "" }, dependencies);

    expect(result.claim).toBe(title);
    expect(result.verificationStatus).toBe("verified");
    expect(dependencies.retrieveEvidence).toHaveBeenCalledWith(title, expect.any(Object));
    expect(dependencies.verifyClaim).toHaveBeenCalled();
  });

  it("retries claim extraction with title and metadata before declaring a factual article not verifiable", async () => {
    const evidence = [{ title: "Evidence", content: "Support", source: "Source", url: "https://example.com" }];
    const dependencies = {
      extractClaim: vi.fn()
        .mockResolvedValueOnce({ hasClaim: false, claim: null })
        .mockResolvedValueOnce({ hasClaim: true, claim: "OpenAI released a new API safety report." }),
      retrieveEvidence: vi.fn().mockResolvedValue({ evidence }),
      selectEvidence: vi.fn().mockResolvedValue({ results: [{ selectedEvidence: [0] }] }),
      prepareAiInput: vi.fn().mockReturnValue({ sources: [], evidence: [] }),
      verifyClaim: vi.fn().mockResolvedValue({ results: [{ model: "model", requestId: "req-real", result: { verdict: "TRUE", confidence: 0.9, reasoning: "Supported", evidence: [] } }], failures: [] }),
      calculateConsensus: vi.fn().mockReturnValue({ verdict: "TRUE" }),
      calculateTruthScore: vi.fn().mockReturnValue({ truthScore: 90 }),
    };

    const result = await verifyDailyArticle({
      id: "twitter:1",
      title: "OpenAI released a new API safety report",
      content: "Read the report for details.",
      source: "OpenAI",
      platform: "twitter",
      publishedAt: "2026-09-05",
    }, dependencies);

    expect(dependencies.extractClaim).toHaveBeenCalledTimes(2);
    expect(dependencies.extractClaim.mock.calls[1][0]).toContain("OpenAI released a new API safety report");
    expect(dependencies.verifyClaim).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expect.objectContaining({ verificationStatus: "verified", claim: "OpenAI released a new API safety report." }));
  });

  it("uses an article-supported fallback claim after both extractor attempts fail", async () => {
    const evidence = [{ title: "Evidence", content: "Support", source: "Source", url: "https://example.com" }];
    const dependencies = {
      extractClaim: vi.fn().mockResolvedValue({ hasClaim: false, claim: null }),
      retrieveEvidence: vi.fn().mockResolvedValue({ evidence }),
      selectEvidence: vi.fn().mockResolvedValue({ results: [{ selectedEvidence: [0] }] }),
      prepareAiInput: vi.fn().mockReturnValue({ sources: [], evidence: [] }),
      verifyClaim: vi.fn().mockResolvedValue({ results: [{ model: "model", requestId: "req-fallback", result: { verdict: "TRUE", confidence: 0.9, reasoning: "Supported", evidence: [] } }], failures: [] }),
      calculateConsensus: vi.fn().mockReturnValue({ verdict: "TRUE" }),
      calculateTruthScore: vi.fn().mockReturnValue({ truthScore: 90 }),
    };

    const result = await verifyDailyArticle({
      id: "news:1",
      title: "OpenAI announced a new API safety report",
      content: "The company published the report on Tuesday.",
      source: "OpenAI",
      platform: "exa",
    }, dependencies);

    expect(dependencies.verifyClaim).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expect.objectContaining({ claim: "OpenAI announced a new API safety report", verificationStatus: "verified" }));
  });

  it("uses a Chinese article-supported fallback claim for an obvious factual event", async () => {
    const evidence = [{ title: "Evidence", content: "Support", source: "Source", url: "https://example.com" }];
    const dependencies = {
      extractClaim: vi.fn().mockResolvedValue({ hasClaim: false, claim: null }),
      retrieveEvidence: vi.fn().mockResolvedValue({ evidence }),
      selectEvidence: vi.fn().mockResolvedValue({ results: [{ selectedEvidence: [0] }] }),
      prepareAiInput: vi.fn().mockReturnValue({ sources: [], evidence: [] }),
      verifyClaim: vi.fn().mockResolvedValue({ results: [{ model: "model", requestId: "req-cn", result: { verdict: "TRUE", confidence: 0.9, reasoning: "Supported", evidence: [] } }], failures: [] }),
      calculateConsensus: vi.fn().mockReturnValue({ verdict: "TRUE" }),
      calculateTruthScore: vi.fn().mockReturnValue({ truthScore: 90 }),
    };

    const result = await verifyDailyArticle({
      id: "bilibili:1",
      title: "英伟达宣布投资 Hugging Face",
      content: "相关公司发布了投资消息。",
      platform: "bilibili",
    }, dependencies);

    expect(result).toMatchObject({ claim: "英伟达宣布投资 Hugging Face", verificationStatus: "verified" });
    expect(dependencies.verifyClaim).toHaveBeenCalledTimes(1);
  });

  it("returns evidence_timeout instead of collapsing an evidence timeout into a generic verification failure", async () => {
    const evidenceTimeout = new Error("Evidence retrieval timed out");
    evidenceTimeout.code = "EVIDENCE_TIMEOUT";
    const dependencies = {
      extractClaim: vi.fn().mockResolvedValue({ hasClaim: true, claim: "A factual claim" }),
      retrieveEvidence: vi.fn().mockRejectedValue(evidenceTimeout),
      selectEvidence: vi.fn(),
      prepareAiInput: vi.fn(),
      verifyClaim: vi.fn(),
      calculateConsensus: vi.fn(),
      calculateTruthScore: vi.fn(),
    };

    const result = await verifyDailyArticle(
      { id: "twitter:1", title: "Article", content: "Article content", platform: "twitter" },
      dependencies,
    );

    expect(result).toEqual(expect.objectContaining({ verificationStatus: "evidence_timeout" }));
    expect(dependencies.selectEvidence).not.toHaveBeenCalled();
    expect(dependencies.verifyClaim).not.toHaveBeenCalled();
  });

  it("returns a bounded timeout instead of waiting indefinitely for a slow verification step", async () => {
    const dependencies = {
      extractClaim: vi.fn(() => new Promise(() => {})),
      retrieveEvidence: vi.fn(),
      selectEvidence: vi.fn(),
      prepareAiInput: vi.fn(),
      verifyClaim: vi.fn(),
      calculateConsensus: vi.fn(),
      calculateTruthScore: vi.fn(),
    };

    await expect(verifyDailyArticle(
      { id: "twitter:slow", title: "Slow", content: "A factual claim", platform: "twitter" },
      dependencies,
      { timeoutMs: 10 },
    )).resolves.toMatchObject({
      evidenceStatus: "timeout",
      verificationStatus: "gonka_timeout",
      verificationTrace: [{ stage: "daily_pipeline", status: "timeout", code: "DAILY_VERIFICATION_TIMEOUT" }],
    });
  });

  it("does not discard a valid verification that completes after the former 45-second Daily deadline", async () => {
    vi.useFakeTimers();
    const dependencies = {
      extractClaim: vi.fn().mockResolvedValue({ hasClaim: true, claim: "A factual claim" }),
      retrieveEvidence: vi.fn().mockResolvedValue({ evidence: [{ title: "Evidence", content: "Supports claim" }] }),
      selectEvidence: vi.fn().mockResolvedValue({ results: [{ selectedEvidence: [0] }] }),
      prepareAiInput: vi.fn().mockReturnValue({ claim: "A factual claim", evidence: [] }),
      verifyClaim: vi.fn(() => new Promise((resolve) => {
        setTimeout(() => resolve({ results: [{ model: "MiniMax", requestId: "req-late", result: { verdict: "TRUE", confidence: 0.9, reasoning: "Supported" } }], failures: [] }), 60_000);
      })),
      calculateConsensus: vi.fn().mockReturnValue({ verdict: "TRUE" }),
      calculateTruthScore: vi.fn().mockReturnValue({ truthScore: 90 }),
    };

    const result = verifyDailyArticle(
      { id: "reddit:late", title: "Article", content: "A factual claim", platform: "reddit" },
      dependencies,
    );

    await vi.advanceTimersByTimeAsync(60_000);
    await expect(result).resolves.toMatchObject({
      verificationStatus: "verified",
      evidenceStatus: "available",
      truthScore: { truthScore: 90 },
    });
  });
});
