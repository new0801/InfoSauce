const express = require("express");
const { verifyClaim } = require("../services/verifier");
const { calculateConsensus } = require("../services/consensus");
const { calculateTruthScore } = require("../services/truthscore");
const { getNewsByArea } = require("../services/data");
const { prepareAiInput } = require("../services/prepareAIInput");
const { extractClaim } = require("../services/claimextractor");
const { retrieveEvidence } = require("../services/evidence");

const router = express.Router();

const MAX_CONCURRENT_AREAS = Math.max(
    1,
    Number.parseInt(
        process.env.MAX_CONCURRENT_AREAS || "2",
        10
    ) || 2
);

const MAX_NEWS_CANDIDATES_PER_AREA = Math.min(
    10,
    Math.max(
        2,
        Number.parseInt(
            process.env.MAX_CANDIDATES_PER_AREA || "2",
            10
        ) || 2
    )
);

const MAX_SELECTED_EVIDENCE = 5;


// ======================================================
// CONCURRENCY
// ======================================================

async function runWithConcurrency(
    items,
    concurrency,
    worker
) {
    const results = new Array(items.length);
    let nextIndex = 0;

    async function runWorker() {
        while (nextIndex < items.length) {
            const index = nextIndex++;

            try {
                results[index] = {
                    status: "fulfilled",
                    value: await worker(items[index])
                };
            } catch (reason) {
                results[index] = {
                    status: "rejected",
                    reason
                };
            }
        }
    }

    await Promise.all(
        Array.from(
            {
                length: Math.min(
                    concurrency,
                    items.length
                )
            },
            runWorker
        )
    );

    return results;
}


// ======================================================
// TEXT HELPERS
// ======================================================

function normalizeText(text) {
    if (
        typeof text !== "string"
    ) {
        return "";
    }

    return text
        .toLowerCase()
        .replace(
            /[^a-z0-9\s]/g,
            " "
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}


function getMeaningfulWords(text) {
    const stopWords = new Set([
        "about",
        "after",
        "again",
        "against",
        "also",
        "because",
        "before",
        "being",
        "between",
        "could",
        "from",
        "have",
        "into",
        "more",
        "most",
        "other",
        "over",
        "same",
        "should",
        "some",
        "such",
        "than",
        "that",
        "their",
        "there",
        "these",
        "they",
        "this",
        "those",
        "through",
        "under",
        "very",
        "what",
        "when",
        "where",
        "which",
        "while",
        "with",
        "would",
        "will",
        "were",
        "been",
        "being",
        "said",
        "says",
        "news",
        "according",
        "reported",
        "reports",
        "report"
    ]);

    return [
        ...new Set(
            normalizeText(text)
                .split(" ")
                .filter(
                    word =>
                        word.length >= 3 &&
                        !stopWords.has(word)
                )
        )
    ];
}


// ======================================================
// TRENDING CANDIDATE FILTERING
// ======================================================
//
// IMPORTANT:
//
// This remains a SOFT filter.
//
// We only remove candidates that are obviously unusable.
// We do NOT require a particular URL structure.
//
// This is important because different research providers
// can return very different URL formats.
//
// ======================================================

function isUsableCandidate(
    newsItem
) {
    if (
        !newsItem ||
        typeof newsItem !== "object"
    ) {
        return false;
    }

    const title =
        typeof newsItem.title === "string"
            ? newsItem.title.trim()
            : "";

    const content =
        typeof newsItem.content === "string"
            ? newsItem.content.trim()
            : "";

    const url =
        typeof newsItem.url === "string"
            ? newsItem.url.trim()
            : "";

    if (
        title === "" ||
        content === "" ||
        url === ""
    ) {
        return false;
    }


    // --------------------------------------------------
    // Minimum content requirement
    // --------------------------------------------------

    if (
        content.length < 80
    ) {
        return false;
    }


    // --------------------------------------------------
    // Validate URL
    // --------------------------------------------------

    let parsedUrl;

    try {
        parsedUrl =
            new URL(url);
    } catch {
        return false;
    }

    if (
        parsedUrl.protocol !== "http:" &&
        parsedUrl.protocol !== "https:"
    ) {
        return false;
    }


    const pathname =
        parsedUrl.pathname
            .toLowerCase()
            .replace(
                /\/+/g,
                "/"
            );

    const search =
        parsedUrl.search.toLowerCase();


    // --------------------------------------------------
    // Reject obvious search pages
    // --------------------------------------------------

    if (
        pathname.includes("/search")
    ) {
        return false;
    }

    if (
        search.includes("q=") ||
        search.includes("query=") ||
        search.includes("search=")
    ) {
        return false;
    }


    // --------------------------------------------------
    // Reject obvious pagination pages
    // --------------------------------------------------

    if (
        /^\/page\/\d+\/?$/.test(
            pathname
        )
    ) {
        return false;
    }


    // --------------------------------------------------
    // Reject obvious homepage
    // --------------------------------------------------

    if (
        pathname === "/" &&
        title.length < 40
    ) {
        return false;
    }


    // --------------------------------------------------
    // Reject obvious feed/API URLs
    // --------------------------------------------------

    if (
        pathname.endsWith(".xml") ||
        pathname.endsWith(".json") ||
        pathname.includes("/feed/")
    ) {
        return false;
    }


    return true;
}


function filterTrendingCandidates(
    newsItems
) {
    if (
        !Array.isArray(newsItems)
    ) {
        return [];
    }

    return newsItems.filter(
        item =>
            isUsableCandidate(
                item
            )
    );
}


// ======================================================
// TRENDING CANDIDATE RANKING
// ======================================================
//
// Ranking is deterministic and cheap.
//
// The ranking strongly prefers:
//
// 1. Real article pages
// 2. Factual headlines
// 3. Strong article content
// 4. Relevant sources
// 5. Relevant content for the requested area
//
// It strongly penalizes:
//
// 1. Generic category/section pages
// 2. Social discussion posts
// 3. Search/archive pages
// 4. Questions
// 5. Personal posts
//
// IMPORTANT:
//
// URL structure is still a BONUS/PENALTY,
// not a hard requirement.
//
// ======================================================

function calculateCandidateScore(
    newsItem,
    area
) {
    if (
        !newsItem ||
        typeof newsItem !== "object"
    ) {
        return -Infinity;
    }

    const title =
        typeof newsItem.title === "string"
            ? newsItem.title.trim()
            : "";

    const content =
        typeof newsItem.content === "string"
            ? newsItem.content.trim()
            : "";

    const source =
        typeof newsItem.source === "string"
            ? newsItem.source.trim()
            : "";

    const url =
        typeof newsItem.url === "string"
            ? newsItem.url.trim()
            : "";

    if (
        title === "" ||
        content === ""
    ) {
        return -Infinity;
    }

    const normalizedTitle =
        normalizeText(title);

    const normalizedContent =
        normalizeText(content);

    const normalizedSource =
        normalizeText(source);

    const lowerUrl =
        url.toLowerCase();

    let score = 0;


    // --------------------------------------------------
    // Parse URL
    // --------------------------------------------------

    let parsedUrl = null;

    try {
        parsedUrl =
            new URL(url);
    } catch {
        parsedUrl = null;
    }

    const pathname =
        parsedUrl
            ? parsedUrl.pathname
                .toLowerCase()
                .replace(
                    /\/+/g,
                    "/"
                )
            : "";

    const hostname =
        parsedUrl
            ? parsedUrl.hostname.toLowerCase()
            : "";


    // --------------------------------------------------
    // 1. Title quality
    // --------------------------------------------------

    if (
        title.length >= 25 &&
        title.length <= 180
    ) {
        score += 15;
    }
    else if (
        title.length >= 15
    ) {
        score += 8;
    }
    else {
        score -= 5;
    }


    // --------------------------------------------------
    // 2. Content quality
    // --------------------------------------------------

    if (
        content.length >= 800
    ) {
        score += 25;
    }
    else if (
        content.length >= 500
    ) {
        score += 20;
    }
    else if (
        content.length >= 200
    ) {
        score += 15;
    }
    else if (
        content.length >= 100
    ) {
        score += 8;
    }
    else {
        score -= 10;
    }


    // --------------------------------------------------
    // 3. Concrete factual-language signals
    // --------------------------------------------------

    const factualKeywords = [
        "announced",
        "announces",
        "reported",
        "reports",
        "according",
        "confirmed",
        "confirms",
        "launched",
        "launches",
        "released",
        "release",
        "approved",
        "signed",
        "appointed",
        "elected",
        "won",
        "lost",
        "acquired",
        "invested",
        "increased",
        "decreased",
        "reached",
        "plans",
        "will",
        "million",
        "billion",
        "percent",
        "2026"
    ];

    let factualSignalCount = 0;

    for (
        const keyword of factualKeywords
    ) {
        if (
            normalizedTitle.includes(
                keyword
            ) ||
            normalizedContent.includes(
                keyword
            )
        ) {
            factualSignalCount++;
        }
    }

    score += Math.min(
        factualSignalCount * 3,
        21
    );


    // --------------------------------------------------
    // 4. Strong factual headline signals
    // --------------------------------------------------
    //
    // Headlines containing a concrete event/action
    // are more likely to represent an actual story.
    //

    const strongHeadlineSignals = [
        "announced",
        "announces",
        "launches",
        "launched",
        "released",
        "reports",
        "reported",
        "confirmed",
        "confirms",
        "acquires",
        "acquired",
        "appoints",
        "appointed",
        "wins",
        "won",
        "loses",
        "lost",
        "signs",
        "signed",
        "approves",
        "approved",
        "plans",
        "reveals",
        "revealed",
        "falls",
        "rises",
        "surges",
        "drops",
        "cuts",
        "raises"
    ];

    let strongHeadlineSignal = false;

    for (
        const keyword
        of strongHeadlineSignals
    ) {
        if (
            normalizedTitle.includes(
                keyword
            )
        ) {
            strongHeadlineSignal = true;
            break;
        }
    }

    if (
        strongHeadlineSignal
    ) {
        score += 10;
    }


    // --------------------------------------------------
    // 5. High-authority source
    // --------------------------------------------------

    const highAuthoritySources = [
        "reuters",
        "associated press",
        "ap news",
        "bbc",
        "bloomberg",
        "cnn",
        "cnbc",
        "guardian",
        "new york times",
        "washington post",
        "financial times",
        "al jazeera",
        "the economist",
        "nasa",
        "who",
        "united nations",
        "government",
        "gov",
        "openai",
        "microsoft",
        "google",
        "apple",
        "meta",
        "hybe"
    ];

    let authorityMatched = false;

    for (
        const authority
        of highAuthoritySources
    ) {
        if (
            normalizedSource.includes(
                authority
            ) ||
            normalizedTitle.includes(
                authority
            ) ||
            hostname.includes(
                authority.replace(
                    /\s+/g,
                    ""
                )
            )
        ) {
            authorityMatched = true;
            break;
        }
    }

    if (
        authorityMatched
    ) {
        score += 25;
    }


    // --------------------------------------------------
    // 6. URL quality
    // --------------------------------------------------

    if (
        lowerUrl.startsWith(
            "https://"
        )
    ) {
        score += 5;
    }


    // --------------------------------------------------
    // 7. Social platform penalties
    // --------------------------------------------------

    if (
        hostname.includes(
            "reddit.com"
        )
    ) {
        score -= 20;
    }

    if (
        hostname.includes(
            "youtube.com"
        ) ||
        hostname.includes(
            "youtu.be"
        )
    ) {
        score -= 5;
    }

    if (
        hostname.includes(
            "facebook.com"
        ) ||
        hostname.includes(
            "instagram.com"
        ) ||
        hostname.includes(
            "tiktok.com"
        ) ||
        hostname.includes(
            "x.com"
        ) ||
        hostname.includes(
            "twitter.com"
        )
    ) {
        score -= 15;
    }


    // --------------------------------------------------
    // 8. Article-like URL BONUS
    // --------------------------------------------------
    //
    // Stronger than before, but still only a bonus.
    //

    const articleUrlIndicators = [
        "/article/",
        "/articles/",
        "/story/",
        "/stories/",
        "/post/",
        "/posts/",
        "/news/",
        "/report/",
        "/reports/"
    ];

    if (
        articleUrlIndicators.some(
            indicator =>
                pathname.includes(
                    indicator
                )
        )
    ) {
        score += 15;
    }


    // --------------------------------------------------
    // 9. Date-based article URL BONUS
    // --------------------------------------------------

    if (
        /\/20\d{2}\/\d{1,2}\/\d{1,2}\//.test(
            pathname
        )
    ) {
        score += 15;
    }


    // Some sites use year/month without day.

    if (
        /\/20\d{2}\/\d{1,2}\//.test(
            pathname
        )
    ) {
        score += 8;
    }


    // --------------------------------------------------
    // 10. URL slug quality
    // --------------------------------------------------

    const pathSegments =
        pathname
            .split("/")
            .filter(
                segment =>
                    segment !== ""
            );

    const finalSegment =
        pathSegments[
            pathSegments.length - 1
        ] || "";

    const slugWords =
        finalSegment
            .split("-")
            .filter(
                word =>
                    word.length >= 2
            );

    if (
        slugWords.length >= 6
    ) {
        score += 12;
    }
    else if (
        slugWords.length >= 4
    ) {
        score += 8;
    }


    // --------------------------------------------------
    // 11. Generic section-page penalty
    // --------------------------------------------------
    //
    // These pages are NOT rejected outright.
    //
    // They receive a large penalty so that a real article
    // can outrank them.
    //

    const genericPathPatterns = [
        "/category/",
        "/categories/",
        "/tag/",
        "/tags/",
        "/topic/",
        "/topics/",
        "/archive/",
        "/archives/",
        "/section/",
        "/sections/",
        "/money/",
        "/business/",
        "/business-and-finance/",
        "/finance/",
        "/markets/",
        "/technology/",
        "/tech/",
        "/world/",
        "/entertainment/",
        "/science/",
        "/politics/",
        "/news/world/",
        "/news/business/",
        "/news/technology/",
        "/news/entertainment/"
    ];

    const genericPathMatched =
        genericPathPatterns.some(
            pattern =>
                pathname === pattern ||
                pathname.startsWith(
                    pattern
                )
        );

    if (
        genericPathMatched
    ) {
        score -= 40;
    }


    // --------------------------------------------------
    // 12. Root/category-like URL penalty
    // --------------------------------------------------
    //
    // Example:
    //
    // https://www.usatoday.com/money/
    //
    // This is not a story even if the title contains
    // useful words.
    //

    const meaningfulPathSegments =
        pathSegments.filter(
            segment =>
                segment.length > 1
        );

    if (
        meaningfulPathSegments.length <= 1
    ) {
        score -= 20;
    }


    // --------------------------------------------------
    // 13. Generic title penalty
    // --------------------------------------------------

    const genericTitles = [
        "latest news",
        "latest news and updates",
        "latest news updates",
        "latest news from around the world",
        "latest news from around the world",
        "world news",
        "business news",
        "business and finance",
        "business finance",
        "the latest money business finance news",
        "money news",
        "finance news",
        "business and finance news",
        "technology news",
        "tech news",
        "entertainment news",
        "science news",
        "politics news",
        "latest business news",
        "latest finance news",
        "latest technology news"
    ];

    if (
        genericTitles.includes(
            normalizedTitle
        )
    ) {
        score -= 40;
    }


    // --------------------------------------------------
    // 14. Generic-title pattern detection
    // --------------------------------------------------
    //
    // Some generic pages have slightly different titles,
    // for example:
    //
    // "The Latest Money, Business & Finance News"
    //
    // We detect those using combinations of words.
    //

    const genericTitlePatterns = [
        [
            "latest",
            "money",
            "business",
            "finance"
        ],
        [
            "latest",
            "business",
            "finance"
        ],
        [
            "latest",
            "news",
            "updates"
        ],
        [
            "business",
            "finance",
            "news"
        ],
        [
            "world",
            "news",
            "updates"
        ],
        [
            "technology",
            "news",
            "updates"
        ],
        [
            "entertainment",
            "news",
            "updates"
        ]
    ];

    const titleWords =
        new Set(
            normalizedTitle.split(" ")
        );

    for (
        const pattern
        of genericTitlePatterns
    ) {
        const matched =
            pattern.every(
                word =>
                    titleWords.has(
                        word
                    )
            );

        if (
            matched
        ) {
            score -= 25;
            break;
        }
    }


    // --------------------------------------------------
    // 15. Source type
    // --------------------------------------------------

    if (
        typeof newsItem.sourceType ===
            "string"
    ) {
        const sourceType =
            newsItem.sourceType.toLowerCase();

        if (
            sourceType === "social_media" ||
            sourceType === "social"
        ) {
            score -= 15;
        }

        if (
            sourceType === "news"
        ) {
            score += 15;
        }

        if (
            sourceType === "official"
        ) {
            score += 20;
        }
    }


    // --------------------------------------------------
    // 16. Area relevance
    // --------------------------------------------------
    //
    // This is an important new ranking factor.
    //
    // A candidate should not only be "a good article".
    // It should also be relevant to the area being processed.
    //

    const areaKeywords = {
        "Business & Money": [
            "business",
            "company",
            "companies",
            "finance",
            "financial",
            "economy",
            "economic",
            "market",
            "markets",
            "stock",
            "stocks",
            "shares",
            "investor",
            "investment",
            "bank",
            "banking",
            "money",
            "revenue",
            "profit",
            "earnings",
            "funding",
            "startup",
            "startups",
            "industry",
            "trade",
            "inflation",
            "interest rate",
            "jobs",
            "employment",
            "layoff",
            "layoffs",
            "salary",
            "mortgage"
        ],

        "AI & Technology": [
            "ai",
            "artificial intelligence",
            "technology",
            "tech",
            "software",
            "robot",
            "robotics",
            "computer",
            "semiconductor",
            "chip",
            "chips",
            "cybersecurity",
            "cyber",
            "data",
            "app",
            "apps",
            "smartphone",
            "phone",
            "device",
            "devices",
            "cloud",
            "model",
            "models",
            "openai",
            "microsoft",
            "google",
            "apple",
            "nvidia"
        ],

        "World & Local": [
            "world",
            "international",
            "global",
            "malaysia",
            "malaysian",
            "kuala lumpur",
            "government",
            "minister",
            "president",
            "election",
            "politics",
            "parliament",
            "diplomacy",
            "treaty",
            "sanctions",
            "earthquake",
            "flood",
            "wildfire",
            "disaster",
            "emergency",
            "school",
            "students",
            "community"
        ],

        "Entertainment & K-Pop": [
            "k-pop",
            "kpop",
            "idol",
            "comeback",
            "korean",
            "k-drama",
            "movie",
            "film",
            "cinema",
            "music",
            "album",
            "song",
            "concert",
            "celebrity",
            "actor",
            "actress",
            "entertainment",
            "viral",
            "meme"
        ]
    };

    const keywords =
        areaKeywords[
            area
        ] || [];

    let areaMatches = 0;

    for (
        const keyword
        of keywords
    ) {
        if (
            normalizedTitle.includes(
                keyword
            )
        ) {
            areaMatches += 2;
        }
        else if (
            normalizedContent.includes(
                keyword
            )
        ) {
            areaMatches += 1;
        }
    }

    score += Math.min(
        areaMatches * 2,
        20
    );


    // --------------------------------------------------
    // 17. Personal-post signals
    // --------------------------------------------------

    const personalSignals = [
        "my first",
        "my experience",
        "my story",
        "my business",
        "my journey",
        "i am",
        "i'm",
        "i have",
        "i got",
        "i made",
        "i work",
        "we are",
        "we're",
        "our business",
        "our company",
        "just wanted to know",
        "does anyone know",
        "can someone explain"
    ];

    for (
        const signal
        of personalSignals
    ) {
        if (
            normalizedTitle.includes(
                signal
            )
        ) {
            score -= 25;
            break;
        }
    }


    // --------------------------------------------------
    // 18. Discussion-language penalty
    // --------------------------------------------------

    const discussionSignals = [
        "just wanted to know",
        "does anyone know",
        "what do you think",
        "thoughts?",
        "anyone else",
        "can someone",
        "help me",
        "looking for advice",
        "need advice",
        "discussion",
        "question",
        "asking for"
    ];

    for (
        const signal
        of discussionSignals
    ) {
        if (
            normalizedTitle.includes(
                signal
            )
        ) {
            score -= 20;
            break;
        }
    }


    // --------------------------------------------------
    // 19. Question/discussion penalty
    // --------------------------------------------------

    if (
        title.includes("?")
    ) {
        score -= 10;
    }

    if (
        normalizedTitle.startsWith(
            "what "
        ) ||
        normalizedTitle.startsWith(
            "why "
        ) ||
        normalizedTitle.startsWith(
            "how "
        ) ||
        normalizedTitle.startsWith(
            "should "
        ) ||
        normalizedTitle.startsWith(
            "can "
        )
    ) {
        score -= 5;
    }


    // --------------------------------------------------
    // 20. Low-information title penalty
    // --------------------------------------------------

    const meaningfulTitleWords =
        getMeaningfulWords(
            title
        );

    if (
        meaningfulTitleWords.length < 3
    ) {
        score -= 15;
    }


    // --------------------------------------------------
    // 21. Article headline structure bonus
    // --------------------------------------------------
    //
    // A real news headline often contains a subject,
    // an action, and some concrete information.
    //
    // This is intentionally a small bonus.
    //

    if (
        meaningfulTitleWords.length >= 6
    ) {
        score += 5;
    }

    if (
        /\b\d+\b/.test(title)
    ) {
        score += 5;
    }


    return score;
}


function getCandidateKey(
    item
) {
    if (
        item &&
        typeof item.url ===
            "string" &&
        item.url.trim() !== ""
    ) {
        return item.url
            .trim()
            .toLowerCase();
    }

    return (
        normalizeText(
            item?.title || ""
        ) +
        "|" +
        normalizeText(
            item?.source || ""
        )
    );
}


function rankTrendingCandidates(
    newsItems,
    area
) {
    if (
        !Array.isArray(
            newsItems
        )
    ) {
        return [];
    }

    const uniqueCandidates = [];
    const seen = new Set();


    for (
        const item of newsItems
    ) {
        if (
            !item ||
            typeof item !== "object"
        ) {
            continue;
        }

        const key =
            getCandidateKey(
                item
            );

        if (
            seen.has(key)
        ) {
            continue;
        }

        seen.add(key);

        uniqueCandidates.push({
            item,
            score:
                calculateCandidateScore(
                    item,
                    area
                )
        });
    }


    uniqueCandidates.sort(
        (a, b) =>
            b.score - a.score
    );


    return uniqueCandidates;
}


// ======================================================
// EVIDENCE RANKING
// ======================================================

function calculateEvidenceScore(
    claim,
    evidenceItem
) {
    const claimWords =
        getMeaningfulWords(
            claim
        );

    if (
        claimWords.length === 0
    ) {
        return 0;
    }

    const title =
        normalizeText(
            evidenceItem.title
        );

    const content =
        normalizeText(
            evidenceItem.content
        );

    const source =
        normalizeText(
            evidenceItem.source
        );

    const combinedText =
        `${title} ${content}`;

    let score = 0;


    // --------------------------------------------------
    // 1. Claim word overlap
    // --------------------------------------------------

    let matchedWords = 0;

    for (
        const word of claimWords
    ) {
        if (
            combinedText.includes(
                word
            )
        ) {
            matchedWords++;
        }
    }

    const overlapRatio =
        matchedWords /
        claimWords.length;

    score +=
        overlapRatio * 60;


    // --------------------------------------------------
    // 2. Title relevance
    // --------------------------------------------------

    let titleMatches = 0;

    for (
        const word of claimWords
    ) {
        if (
            title.includes(
                word
            )
        ) {
            titleMatches++;
        }
    }

    const titleRatio =
        titleMatches /
        claimWords.length;

    score +=
        titleRatio * 20;


    // --------------------------------------------------
    // 3. Source availability
    // --------------------------------------------------

    if (
        typeof evidenceItem.url ===
            "string" &&
        evidenceItem.url.trim() !== ""
    ) {
        score += 5;
    }


    // --------------------------------------------------
    // 4. Source quality hints
    // --------------------------------------------------

    const highAuthoritySources = [
        "reuters",
        "associated press",
        "ap news",
        "bbc",
        "bloomberg",
        "cnn",
        "cnbc",
        "guardian",
        "new york times",
        "washington post",
        "united nations",
        "un news",
        "who",
        "nasa",
        "government",
        "gov",
        "microsoft",
        "google",
        "apple",
        "meta",
        "openai",
        "bighit",
        "hybe"
    ];

    for (
        const authority
        of highAuthoritySources
    ) {
        if (
            source.includes(
                authority
            ) ||
            title.includes(
                authority
            )
        ) {
            score += 15;
            break;
        }
    }


    return score;
}


function getEvidenceKey(
    item
) {
    if (
        typeof item.url ===
            "string" &&
        item.url.trim() !== ""
    ) {
        return item.url
            .trim()
            .toLowerCase();
    }

    return (
        normalizeText(
            item.title
        ) +
        "|" +
        normalizeText(
            item.source
        )
    );
}


function rankEvidence(
    claim,
    evidence
) {
    if (
        !Array.isArray(
            evidence
        )
    ) {
        return [];
    }

    const uniqueEvidence = [];
    const seen = new Set();

    for (
        const item of evidence
    ) {
        if (
            !item ||
            typeof item !== "object"
        ) {
            continue;
        }

        const key =
            getEvidenceKey(
                item
            );

        if (
            seen.has(key)
        ) {
            continue;
        }

        seen.add(key);

        uniqueEvidence.push({
            ...item,
            _score:
                calculateEvidenceScore(
                    claim,
                    item
                )
        });
    }

    uniqueEvidence.sort(
        (a, b) =>
            b._score - a._score
    );

    return uniqueEvidence
        .slice(
            0,
            MAX_SELECTED_EVIDENCE
        )
        .map(
            item => {
                const {
                    _score,
                    ...cleanItem
                } = item;

                return cleanItem;
            }
        );
}


// ======================================================
// POST /api/verify
// ======================================================

router.post(
    "/verify",
    async (req, res) => {
        try {
            const input =
                req.body;


            if (
                !input ||
                typeof input !== "object" ||
                !input.claim ||
                typeof input.claim !== "string" ||
                input.claim.trim() === "" ||
                !Array.isArray(
                    input.sources
                ) ||
                !Array.isArray(
                    input.evidence
                )
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        error: {
                            code:
                                "INVALID_INPUT",
                            message:
                                "A valid claim, sources array, and evidence array are required"
                        }
                    });
            }


            const verification =
                await verifyClaim(
                    input
                );


            const consensus =
                calculateConsensus(
                    verification
                );


            const truthScore =
                calculateTruthScore(
                    verification.results,
                    consensus
                );


            return res
                .status(200)
                .json({
                    success: true,
                    claim:
                        input.claim.trim(),
                    verification,
                    consensus,
                    truthScore
                });

        } catch (error) {

            console.error(
                "Verification failed:",
                error
            );


            if (
                error.code ===
                "ALL_MODELS_FAILED"
            ) {
                return res
                    .status(503)
                    .json({
                        success: false,
                        error: {
                            code:
                                "VERIFICATION_UNAVAILABLE",
                            message:
                                "All verification models failed. Please try again later."
                        }
                    });
            }


            return res
                .status(500)
                .json({
                    success: false,
                    error: {
                        code:
                            "INTERNAL_SERVER_ERROR",
                        message:
                            "An unexpected error occurred while processing the verification."
                    }
                });
        }
    }
);


// ======================================================
// PROCESS ONE TRENDING AREA
// ======================================================

async function processArea(
    area
) {
    console.log(
        `\n===== PROCESSING AREA: ${area} =====`
    );


    // --------------------------------------------------
    // 1. Retrieve news
    // --------------------------------------------------

    const researchStart =
        Date.now();

    const newsItems =
        await getNewsByArea(
            area
        );


    console.log(
        `⏱️ RESEARCH TIME (${area}): ${
            Date.now() -
            researchStart
        } ms`
    );


    if (
        !Array.isArray(
            newsItems
        )
    ) {
        throw new Error(
            `Invalid research response for area: ${area}`
        );
    }


    if (
        newsItems.length === 0
    ) {
        throw new Error(
            `No news found for area: ${area}`
        );
    }


    console.log(
        `📰 NEWS CANDIDATES (${area}): ${
            newsItems.length
        }`
    );


    // --------------------------------------------------
    // 2. Soft candidate filtering
    // --------------------------------------------------

    const candidateFilteringStart =
        Date.now();

    const articleCandidates =
        filterTrendingCandidates(
            newsItems
        );

    console.log(
        `⏱️ CANDIDATE FILTERING TIME: ${
            Date.now() -
            candidateFilteringStart
        } ms`
    );

    console.log(
        `📰 USABLE CANDIDATES (${area}): ${
            articleCandidates.length
        }`
    );


    if (
        articleCandidates.length ===
        0
    ) {
        throw new Error(
            `No usable candidates found for area: ${area}`
        );
    }


    // --------------------------------------------------
    // 3. Rank candidates
    // --------------------------------------------------

    const candidateRankingStart =
        Date.now();

    const rankedCandidates =
        rankTrendingCandidates(
            articleCandidates,
            area
        );

    console.log(
        `⏱️ CANDIDATE RANKING TIME: ${
            Date.now() -
            candidateRankingStart
        } ms`
    );

    console.log(
        `📊 RANKED CANDIDATES (${area}): ${
            rankedCandidates.length
        }`
    );


    rankedCandidates
        .slice(
            0,
            Math.min(
                5,
                rankedCandidates.length
            )
        )
        .forEach(
            (
                candidate,
                index
            ) => {

                console.log(
                    `   [${index}] score=${
                        candidate.score.toFixed(
                            2
                        )
                    } | ${
                        candidate.item.source ||
                        "Unknown source"
                    } | ${
                        candidate.item.title ||
                        "Untitled"
                    } | ${
                        candidate.item.url ||
                        "No URL"
                    }`
                );
            }
        );


    // --------------------------------------------------
    // 4. Try candidates
    // --------------------------------------------------
    //
    // We intentionally keep the candidate limit low.
    //
    // This prevents expensive claim extraction calls
    // from exploding the total latency.
    //
    // If a candidate fails, the next ranked candidate
    // is attempted.
    //

    const candidates =
        rankedCandidates
            .slice(
                0,
                Math.min(
                    MAX_NEWS_CANDIDATES_PER_AREA,
                    rankedCandidates.length
                )
            )
            .map(
                candidate =>
                    candidate.item
            );


    for (
        let candidateIndex = 0;
        candidateIndex <
        candidates.length;
        candidateIndex++
    ) {

        const newsItem =
            candidates[
                candidateIndex
            ];


        try {

            console.log(
                `\n--- TRYING NEWS ITEM ${
                    candidateIndex + 1
                }/${candidates.length}: ${
                    newsItem.id
                } ---`
            );


            // --------------------------------------------------
            // CLAIM EXTRACTION
            // --------------------------------------------------

            const claimStart =
                Date.now();

            const extractedClaim =
                await extractClaim(
                    newsItem.content
                );


            console.log(
                `⏱️ CLAIM EXTRACTION TIME: ${
                    Date.now() -
                    claimStart
                } ms`
            );


            if (
                !extractedClaim ||
                !extractedClaim.hasClaim ||
                typeof extractedClaim.claim !==
                    "string" ||
                extractedClaim.claim.trim() === ""
            ) {

                console.log(
                    `⏭️ Skipping non-factual item: ${
                        newsItem.id
                    }`
                );

                continue;
            }


            const claim =
                extractedClaim.claim.trim();


            console.log(
                `✅ FACTUAL CLAIM FOUND: ${claim}`
            );


            // --------------------------------------------------
            // EVIDENCE RETRIEVAL
            // --------------------------------------------------

            console.log(
                ">>> REACHED EVIDENCE RETRIEVAL"
            );


            const evidenceStart =
                Date.now();

            const evidenceResult =
                await retrieveEvidence(
                    claim
                );


            console.log(
                `⏱️ EVIDENCE RETRIEVAL TIME: ${
                    Date.now() -
                    evidenceStart
                } ms`
            );


            if (
                !evidenceResult ||
                !Array.isArray(
                    evidenceResult.evidence
                )
            ) {
                throw new Error(
                    "Invalid evidence retrieval response"
                );
            }


            console.log(
                `>>> EVIDENCE RETRIEVED: ${
                    evidenceResult.evidence.length
                }`
            );


            if (
                evidenceResult.evidence.length ===
                0
            ) {

                console.log(
                    `⏭️ No evidence found for ${
                        newsItem.id
                    }`
                );

                continue;
            }


            // --------------------------------------------------
            // 5. Deterministic evidence ranking
            // --------------------------------------------------

            const selectionStart =
                Date.now();

            const selectedEvidence =
                rankEvidence(
                    claim,
                    evidenceResult.evidence
                );


            console.log(
                `⏱️ EVIDENCE RANKING TIME: ${
                    Date.now() -
                    selectionStart
                } ms`
            );


            console.log(
                `>>> SELECTED EVIDENCE: ${
                    selectedEvidence.length
                }`
            );


            selectedEvidence.forEach(
                (
                    item,
                    index
                ) => {

                    console.log(
                        `   [${index}] ${
                            item.source ||
                            "Unknown source"
                        } - ${
                            item.title ||
                            "Untitled"
                        }`
                    );
                }
            );


            if (
                selectedEvidence.length ===
                0
            ) {

                console.log(
                    `⏭️ No usable evidence for ${
                        newsItem.id
                    }`
                );

                continue;
            }


            // --------------------------------------------------
            // 6. Prepare AI input
            // --------------------------------------------------

            const aiInput =
                prepareAiInput(
                    newsItem,
                    selectedEvidence
                );

            aiInput.claim =
                claim;


            // --------------------------------------------------
            // 7. FINAL VERIFICATION
            // --------------------------------------------------

            const verificationStart =
                Date.now();

            const verification =
                await verifyClaim(
                    aiInput
                );


            console.log(
                `⏱️ FINAL VERIFICATION TIME: ${
                    Date.now() -
                    verificationStart
                } ms`
            );


            // --------------------------------------------------
            // 8. CONSENSUS
            // --------------------------------------------------

            const consensus =
                calculateConsensus(
                    verification
                );


            // --------------------------------------------------
            // 9. TRUTH SCORE
            // --------------------------------------------------

            const truthScore =
                calculateTruthScore(
                    verification.results,
                    consensus
                );


            // --------------------------------------------------
            // 10. VERIFICATION TRACE
            // --------------------------------------------------

            const verificationTrace =
                verification.results.map(
                    item => ({
                        model:
                            item.model,
                        requestId:
                            item.requestId
                    })
                );


            // --------------------------------------------------
            // 11. FORMAT EVIDENCE
            // --------------------------------------------------

            const evidence =
                selectedEvidence.map(
                    (
                        item,
                        index
                    ) => ({
                        evidenceIndex:
                            index,
                        title:
                            item.title ||
                            null,
                        content:
                            item.content ||
                            null,
                        url:
                            item.url ||
                            null,
                        source:
                            item.source ||
                            null,
                        platform:
                            item.platform ||
                            null,
                        publishedAt:
                            item.publishedAt ||
                            null
                    })
                );


            // --------------------------------------------------
            // 12. Evidence selection metadata
            // --------------------------------------------------

            const evidenceSelection = {
                method:
                    "deterministic-ranking",
                candidatesConsidered:
                    evidenceResult
                        .evidence
                        .length,
                selectedCount:
                    selectedEvidence
                        .length
            };


            // --------------------------------------------------
            // SUCCESS
            // --------------------------------------------------

            console.log(
                `✅ SUCCESSFULLY FACT-CHECKED: ${
                    newsItem.id
                }`
            );


            return {
                area,
                news:
                    newsItem,
                claim,
                factCheckable:
                    true,
                evidenceSelection,
                evidence,
                verification,
                verificationTrace,
                consensus,
                truthScore
            };

        } catch (error) {

            console.error(
                `Failed to process news item ${
                    newsItem.id
                } in area ${
                    area
                }:`,
                error.message
            );

            continue;
        }
    }


    throw new Error(
        `Could not find a fact-checkable story for area: ${area}`
    );
}


// ======================================================
// POST /api/category
// ======================================================

router.post(
    "/category",
    async (req, res) => {

        const startTime =
            Date.now();


        try {

            const {
                area,
                areas
            } = req.body;


            const categoryAreas =
                Array.isArray(areas)
                    ? areas
                    : [area];


            // --------------------------------------------------
            // Validate
            // --------------------------------------------------

            if (
                !Array.isArray(
                    categoryAreas
                ) ||
                categoryAreas.length ===
                    0 ||
                categoryAreas.some(
                    item =>
                        typeof item !==
                            "string" ||
                        item.trim() === ""
                )
            ) {

                return res
                    .status(400)
                    .json({
                        success: false,
                        error: {
                            code:
                                "INVALID_AREA",
                            message:
                                "At least one non-empty area is required"
                        }
                    });
            }


            const requestedAreas =
                categoryAreas.map(
                    item =>
                        item.trim()
                );


            // --------------------------------------------------
            // Maximum 4 areas
            // --------------------------------------------------

            if (
                requestedAreas.length >
                4
            ) {

                return res
                    .status(400)
                    .json({
                        success: false,
                        error: {
                            code:
                                "TOO_MANY_AREAS",
                            message:
                                "A maximum of 4 areas is allowed"
                        }
                    });
            }


            console.log(
                "\n======================================"
            );

            console.log(
                "STARTING CATEGORY PROCESSING"
            );

            console.log(
                "AREAS:",
                requestedAreas
            );

            console.log(
                "======================================\n"
            );


            // --------------------------------------------------
            // Process areas concurrently
            // --------------------------------------------------

            const areaResults =
                await runWithConcurrency(
                    requestedAreas,
                    MAX_CONCURRENT_AREAS,
                    processArea
                );


            // --------------------------------------------------
            // Separate successful and failed areas
            // --------------------------------------------------

            const results = [];
            const unavailableAreas =
                [];


            areaResults.forEach(
                (
                    result,
                    index
                ) => {

                    const area =
                        requestedAreas[
                            index
                        ];


                    if (
                        result.status ===
                        "fulfilled"
                    ) {

                        results.push(
                            result.value
                        );

                    }
                    else {

                        console.error(
                            `❌ AREA FAILED: ${area}`,
                            result.reason
                                ?.message ||
                                result.reason
                        );


                        unavailableAreas.push(
                            area
                        );
                    }
                }
            );


            // --------------------------------------------------
            // Timing
            // --------------------------------------------------

            console.log(
                `\n⏱️ CATEGORY TOTAL TIME: ${
                    Date.now() -
                    startTime
                } ms`
            );


            console.log(
                `✅ SUCCESSFUL AREAS: ${
                    results.length
                }`
            );


            console.log(
                `❌ UNAVAILABLE AREAS: ${
                    unavailableAreas.length
                }`
            );


            // --------------------------------------------------
            // Return
            // --------------------------------------------------

            return res
                .status(200)
                .json({
                    success: true,
                    areas:
                        requestedAreas,
                    count:
                        results.length,
                    results,
                    unavailableAreas
                });

        } catch (error) {

            console.error(
                "Category verification failed:",
                error
            );


            return res
                .status(500)
                .json({
                    success: false,
                    error: {
                        code:
                            "INTERNAL_SERVER_ERROR",
                        message:
                            "An unexpected error occurred while processing the categories"
                    }
                });
        }
    }
);



module.exports = router;