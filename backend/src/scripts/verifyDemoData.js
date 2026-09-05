require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
  trending,
  daily,
} = require("../data/demoData");

const { verifyClaim } = require("../services/verifier");
const { calculateConsensus } = require("../services/consensus");
const { calculateTruthScore } = require("../services/truthscore");

function buildVerificationInput(item) {
  const claim =
    item.claim ||
    item.summary ||
    item.title;

  const sources = item.url
    ? [item.url]
    : [];

  const evidence = [
    [
      `Title: ${item.title || "Untitled"}`,
      `Source: ${item.source || "Unknown source"}`,
      `URL: ${item.url || "No URL"}`,
      `Content: ${item.summary || item.content || item.title || "No content"}`,
    ].join("\n"),
  ];

  return {
    claim,
    sources,
    evidence,
  };
}

async function verifyItem(item, category) {
  console.log(`\nVerifying ${item.id}: ${item.title}`);

  try {
    const input = buildVerificationInput(item);

    const verification = await verifyClaim(input);
    const consensus = calculateConsensus(verification);

    const truthScore = calculateTruthScore(
      verification.results,
      consensus
    );

    const reasoning = verification.results
      .map((result) => result.result?.reasoning)
      .filter(Boolean);

    const requestIds = verification.results.map(
      (result) => ({
        model: result.model,
        requestId: result.requestId,
      })
    );

    return {
      ...item,

      category,

      claim: input.claim,

      sources: input.sources,

      evidence: input.evidence.map(
        (evidenceText, index) => ({
          evidenceIndex: index + 1,
          content: evidenceText,
          url: item.url || null,
          source: item.source || null,
          platform: item.platform || "web",
          publishedAt: item.publishedAt || null,
        })
      ),

      verdict: consensus.verdict,

      consensus,

      truthScore,

      reasoning,

      verification,

      requestIds,

      verificationStatus: "verified",
    };
  } catch (error) {
    console.error(
      `Failed ${item.id}:`,
      error.message
    );

    return {
      ...item,

      category,

      claim:
        item.claim ||
        item.summary ||
        item.title,

      evidence: [],

      verdict: "UNCERTAIN",

      truthScore: null,

      reasoning: [
        "Verification failed for this prepared item.",
      ],

      requestIds: [],

      verificationStatus: "failed",

      verificationError: error.message,
    };
  }
}

async function main() {
  const verifiedTrending = [];

  for (const item of trending) {
    const verified = await verifyItem(
      item,
      item.category || "Trending"
    );

    verifiedTrending.push(verified);
  }

  const verifiedDaily = {};

  for (const [category, items] of Object.entries(daily)) {
    verifiedDaily[category] = [];

    for (const item of items) {
      const verified = await verifyItem(
        item,
        category
      );

      verifiedDaily[category].push(verified);
    }
  }

  const output = {
    generatedAt: new Date().toISOString(),
    trending: verifiedTrending,
    daily: verifiedDaily,
  };

  const outputPath = path.join(
    __dirname,
    "../data/verifiedDemoData.json"
  );

  fs.writeFileSync(
    outputPath,
    JSON.stringify(output, null, 2),
    "utf8"
  );

  console.log(
    `\nVerified demo data saved to:\n${outputPath}`
  );
}

main().catch((error) => {
  console.error("Batch verification failed:", error);
  process.exit(1);
});