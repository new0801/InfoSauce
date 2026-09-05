import assert from "node:assert/strict";
import {
  getVerdictFromTruthScore,
  normalizeDailyResult,
  normalizeTrendingItem,
} from "../src/lib/articleData.ts";

assert.equal(getVerdictFromTruthScore(0), "FALSE");
assert.equal(getVerdictFromTruthScore(32), "FALSE");
assert.equal(getVerdictFromTruthScore(49), "FALSE");
assert.equal(getVerdictFromTruthScore(50), "UNCERTAIN");
assert.equal(getVerdictFromTruthScore(51), "TRUE");
assert.equal(getVerdictFromTruthScore(90), "TRUE");
assert.equal(getVerdictFromTruthScore(100), "TRUE");

const requestIds = [
  {
    model: "DeepSeek",
    requestId: "req-1788638714305022512-1243320",
  },
];

const trending = normalizeTrendingItem({
  category: "AI & Technology",
  claim: "A verified trending claim.",
  news: {
    title: "Verified Trending Title",
    content: "Verified Trending Summary",
    source: "NVIDIA",
    url: "https://example.com/trending",
  },
  consensus: { verdict: "TRUE" },
  truthScore: { truthScore: 91.5 },
  evidence: [{ source: "NVIDIA" }],
  verificationTrace: requestIds,
});

assert.equal(trending.title, "Verified Trending Title");
assert.equal(trending.content, "Verified Trending Summary");
assert.equal(trending.source, "NVIDIA");
assert.equal(trending.truthScore, 91.5);
assert.equal(trending.evidence.length, 1);
assert.deepEqual(trending.requestIds, requestIds);

const daily = normalizeDailyResult({
  id: "DAILY001",
  title: "Verified Daily Title",
  content: "Verified Daily Summary",
  source: "Reuters",
  claim: "A verified daily claim.",
  verdict: "FALSE",
  truthScore: 12.5,
  evidence: [{ source: "Reuters" }],
  requestIds,
});

assert.equal(daily.title, "Verified Daily Title");
assert.equal(daily.truthScore, 12.5);
assert.equal(daily.verdict, "FALSE");
assert.equal(daily.evidence.length, 1);
assert.deepEqual(daily.requestIds, requestIds);

const incompleteDaily = normalizeDailyResult({
  title: "Partial Daily Title",
  truthScore: { truthScore: 64 },
});

assert.equal(incompleteDaily.truthScore, 64);
assert.deepEqual(incompleteDaily.evidence, []);
assert.deepEqual(incompleteDaily.reasoning, []);
assert.deepEqual(incompleteDaily.requestIds, []);

console.log("article data mapping regression check passed");
