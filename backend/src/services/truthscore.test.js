import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { calculateTruthScore } = require("./truthscore");

describe("calculateTruthScore", () => {
  const score = (results) => calculateTruthScore(results, { consensusReached: false, voteCounts: { TRUE: 0, FALSE: 0, UNCERTAIN: 0 } });

  it("scores TRUE 0.90 + TRUE 0.80 as strongly supported", () => {
    expect(score([{ result: { verdict: "TRUE", confidence: 0.9 } }, { result: { verdict: "TRUE", confidence: 0.8 } }])).toMatchObject({
      evidenceScore: 0.85, baseScore: 92.5, truthScore: 92.5, consensusType: "agreement_true", truthScoreLabel: "Very strongly supported",
    });
  });

  it("scores FALSE 0.90 + FALSE 0.80 as strongly contradicted", () => {
    const result = score([{ result: { verdict: "FALSE", confidence: 0.9 } }, { result: { verdict: "FALSE", confidence: 0.8 } }]);
    expect(result).toMatchObject({
      evidenceScore: -0.85, baseScore: 7.5, consensusType: "agreement_false", truthScoreLabel: "Very strongly contradicted",
    });
    expect(result.truthScore).toBeCloseTo(7.5);
  });

  it("keeps TRUE/FALSE disagreement at 50 with the conservative factor", () => {
    expect(score([{ result: { verdict: "TRUE", confidence: 0.9 } }, { result: { verdict: "FALSE", confidence: 0.9 } }])).toMatchObject({
      baseScore: 50, truthScore: 50, consensusType: "true_false_disagreement", consensusFactor: 0.25,
    });
  });

  it("treats UNCERTAIN + UNCERTAIN as agreement on insufficient evidence", () => {
    expect(score([{ result: { verdict: "UNCERTAIN", confidence: 0.9 } }, { result: { verdict: "UNCERTAIN", confidence: 0.5 } }])).toMatchObject({
      baseScore: 50, truthScore: 50, consensusType: "agreement_uncertain", consensusFactor: 1,
    });
  });

  it("shrinks a single successful TRUE model toward 50 using actual model coverage", () => {
    const result = score([{ result: { verdict: "TRUE", confidence: 0.95 } }]);
    expect(result).toMatchObject({
      successfulModels: 1, configuredModels: 2, coverage: 0.5, reliability: 0.75, consensusType: "single_model_only",
    });
    expect(result.truthScore).toBeCloseTo(85.625);
  });

  it("does not count an invalid model response as successful coverage", () => {
    expect(score([
      { result: { verdict: "TRUE", confidence: 0.95 } },
      { result: { verdict: "INVALID", confidence: 0.95 } },
    ])).toMatchObject({ successfulModels: 1, coverage: 0.5, reliability: 0.75 });
  });

  it("preserves directional partial TRUE/UNCERTAIN and FALSE/UNCERTAIN evidence", () => {
    expect(score([{ result: { verdict: "TRUE", confidence: 0.9 } }, { result: { verdict: "UNCERTAIN", confidence: 0.8 } }])).toMatchObject({
      consensusType: "partial_true_uncertain", truthScore: 61.25,
    });
    expect(score([{ result: { verdict: "FALSE", confidence: 0.9 } }, { result: { verdict: "UNCERTAIN", confidence: 0.8 } }])).toMatchObject({
      consensusType: "partial_false_uncertain", truthScore: 38.75,
    });
  });

  it("returns no_score rather than fabricating 50 when no model succeeds", () => {
    expect(score([])).toMatchObject({
      truthScore: null, truthScoreLabel: "No score available", consensusType: "no_successful_models", successfulModels: 0,
    });
  });
});
