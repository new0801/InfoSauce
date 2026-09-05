import { describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { verifyExtractedClaim } = require("./claimVerificationEngine");

const article = { id: "user-input", title: "Claim", content: "Claim", source: "Sauce Verify", sourceType: "user_input", url: "" };

describe("verifyExtractedClaim", () => {
  it("uses selected evidence for Gonka verification and returns consensus and Truth Score", async () => {
    const verifyClaim = vi.fn().mockResolvedValue({ results: [{ model: "model-a", result: { verdict: "TRUE", confidence: 0.9, reasoning: "Supported" }, requestId: "req-1" }], failures: [] });
    const result = await verifyExtractedClaim("A factual claim", { article }, {
      retrieveEvidence: vi.fn().mockResolvedValue({ evidence: [{ title: "Evidence", content: "Supports the claim", source: "Source", url: "https://example.com" }] }),
      selectEvidence: vi.fn().mockResolvedValue({ results: [{ selectedEvidence: [0] }], failures: [] }),
      prepareAiInput: vi.fn().mockReturnValue({ claim: "wrong", evidence: [] }),
      verifyClaim,
      calculateConsensus: vi.fn().mockReturnValue({ verdict: "TRUE", voteCounts: { TRUE: 1, FALSE: 0, UNCERTAIN: 0 } }),
      calculateTruthScore: vi.fn().mockReturnValue({ truthScore: 95, verdict: "TRUE" }),
    });

    expect(verifyClaim).toHaveBeenCalledWith({ claim: "A factual claim", evidence: [{ title: "Evidence", content: "Supports the claim", source: "Source", url: "https://example.com" }] });
    expect(result).toMatchObject({ claim: "A factual claim", evidenceStatus: "available", verificationStatus: "completed", consensus: { verdict: "TRUE" }, truthScore: { truthScore: 95 } });
  });

  it("reports evidence_unavailable without calling Gonka when selection is empty", async () => {
    const verifyClaim = vi.fn();
    const result = await verifyExtractedClaim("A factual claim", { article }, {
      retrieveEvidence: vi.fn().mockResolvedValue({ evidence: [{ title: "Unrelated", content: "Other", source: "Source" }] }),
      selectEvidence: vi.fn().mockResolvedValue({ results: [{ selectedEvidence: [] }], failures: [] }),
      prepareAiInput: vi.fn(), verifyClaim,
      calculateConsensus: vi.fn(), calculateTruthScore: vi.fn(),
    });

    expect(verifyClaim).not.toHaveBeenCalled();
    expect(result).toMatchObject({ evidenceStatus: "evidence_unavailable", verificationStatus: "skipped", verificationUnavailable: "No relevant evidence was selected." });
  });
});
