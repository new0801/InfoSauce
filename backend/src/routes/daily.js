const express = require("express");
const {
  trending,
  daily,
  getDailyItems,
} = require("../data/demoData");

const router = express.Router();

router.get("/trending", (req, res) => {
  return res.status(200).json({
    success: true,
    data: trending,
  });
});

router.get("/daily", (req, res) => {
  return res.status(200).json({
    success: true,
    categories: daily,
    items: getDailyItems(),
  });
});

router.post("/search", (req, res) => {
  try {
    const { query, category } = req.body || {};

    if (category && daily[category]) {
      return res.status(200).json({
        success: true,
        results: daily[category],
      });
    }

    const allItems = getDailyItems();

    if (typeof query === "string" && query.trim() !== "") {
      const searchTerm = query.trim().toLowerCase();

      const matchedItems = allItems.filter((item) => {
        const searchableText = [
          item.title,
          item.summary,
          item.content,
          item.category,
          item.source,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(searchTerm);
      });

      return res.status(200).json({
        success: true,
        results:
          matchedItems.length > 0
            ? matchedItems
            : allItems,
      });
    }

    return res.status(200).json({
      success: true,
      results: allItems,
    });
  } catch (error) {
    console.error("Daily route failed:", error);

    return res.status(500).json({
      success: false,
      results: [],
      error: "Unable to load Daily Sauce.",
    });
  }
});

router.post("/category", (req, res) => {
  try {
    const { areas } = req.body || {};

    if (!Array.isArray(areas) || areas.length === 0) {
      return res.status(200).json({
        success: true,
        results: trending,
      });
    }

    const results = areas.flatMap((area) => daily[area] || []);

    return res.status(200).json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Category route failed:", error);

    return res.status(500).json({
      success: false,
      results: [],
      error: {
        code: "CATEGORY_ERROR",
        message: "Unable to load category results.",
      },
    });
  }
});

module.exports = router;