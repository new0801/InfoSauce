const express = require("express");

const verifiedData = require("../data/verifiedDemoData.json");

const router = express.Router();

function getDailyItems() {
  return Object.values(verifiedData.daily).flat();
}

function toTrendingResult(item) {
  return {
    category: item.category,

    claim: item.claim,

    news: {
      id: item.id,
      title: item.title,
      content: item.summary || item.content || "",
      url: item.url,
      source: item.source,
      publishedAt: item.publishedAt,
      area: item.category,
    },

    evidence: item.evidence || [],

    consensus: item.consensus || {
      verdict: item.verdict || "UNCERTAIN",
    },

    truthScore: item.truthScore || {
      truthScore: 0,
    },

    verification: item.verification || {
      results: [],
      failures: [],
    },

    verificationTrace: item.requestIds || [],
  };
}

function toDailyResult(item) {
  return {
    id: item.id,

    title: item.title,

    content:
      item.summary ||
      item.content ||
      "",

    source: item.source,

    sourceType:
      item.platform ||
      "web",

    url: item.url,

    publishedAt:
      item.publishedAt,

    claim:
      item.claim ||
      item.summary ||
      item.title,

    verdict:
      item.verdict ||
      item.consensus?.verdict ||
      "UNCERTAIN",

    truthScore:
      typeof item.truthScore === "number"
        ? item.truthScore
        : item.truthScore?.truthScore ?? 0,

    consensus:
      item.consensus || {
        verdict:
          item.verdict ||
          "UNCERTAIN",
      },

    reasoning:
      Array.isArray(item.reasoning)
        ? item.reasoning
        : [],

    evidence:
      Array.isArray(item.evidence)
        ? item.evidence
        : [],

    requestIds:
      Array.isArray(item.requestIds)
        ? item.requestIds
        : [],
  };
}


// ==============================
// Trending
// ==============================

router.get("/trending", (req, res) => {
  const results =
    verifiedData.trending.map(
      toTrendingResult
    );

  return res.status(200).json({
    success: true,
    data: results,
  });
});


// ==============================
// Daily
// ==============================

router.get("/daily", (req, res) => {
  const items =
    getDailyItems().map(
      toDailyResult
    );

  return res.status(200).json({
    success: true,
    items,
  });
});


// ==============================
// Daily Search
// ==============================

router.post("/search", (req, res) => {
  try {
    const {
      query,
      category,
    } = req.body || {};

    let items =
      getDailyItems();

    if (
      category &&
      verifiedData.daily[category]
    ) {
      items =
        verifiedData.daily[category];
    }

    if (
      typeof query === "string" &&
      query.trim() !== ""
    ) {
      const searchTerm =
        query
          .trim()
          .toLowerCase();

      const matchedItems =
        items.filter((item) => {
          const searchableText = [
            item.title,
            item.summary,
            item.content,
            item.category,
            item.source,
            item.claim,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchableText.includes(
            searchTerm
          );
        });

      if (matchedItems.length > 0) {
        items = matchedItems;
      }
    }

    return res.status(200).json({
      success: true,

      results:
        items.map(
          toDailyResult
        ),
    });

  } catch (error) {
    console.error(
      "Daily route failed:",
      error
    );

    return res.status(500).json({
      success: false,
      results: [],
      error:
        "Unable to load Daily Sauce.",
    });
  }
});


// ==============================
// Homepage Trending
// ==============================

router.post("/category", (req, res) => {
  try {
    const {
      areas,
    } = req.body || {};

    let items =
      verifiedData.trending;

    if (
      Array.isArray(areas) &&
      areas.length > 0
    ) {
      const filtered =
        verifiedData.trending.filter(
          (item) =>
            areas.includes(
              item.category
            )
        );

      if (filtered.length > 0) {
        items = filtered;
      }
    }

    return res.status(200).json({
      success: true,

      results:
        items.map(
          toTrendingResult
        ),
    });

  } catch (error) {
    console.error(
      "Category route failed:",
      error
    );

    return res.status(500).json({
      success: false,
      results: [],
      error: {
        code:
          "CATEGORY_ERROR",
        message:
          "Unable to load category results.",
      },
    });
  }
});

module.exports = router;