import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { calculateConsensus } = require("./consensus");

describe("calculateConsensus", () => {
  it("keeps agreement among successful models separate from coverage failures", () => {
    expect(calculateConsensus({
      results: [{ result: { verdict: "TRUE", confidence: 0.95 } }],
      failures: [{ model: "MiniMaxAI/MiniMax-M2.7", code: "GONKA_TIMEOUT" }],
    })).toMatchObject({
      verdict: "TRUE",
      consensusReached: true,
      failedModels: 1,
      disagreement: false,
    });
  });
});
