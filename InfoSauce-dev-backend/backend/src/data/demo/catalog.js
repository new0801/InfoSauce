const DEMO_NOTICE =
    "Demo Mode — Research and evidence are pre-collected for stability. Verification is performed live through Gonka.";

const EARTH_EVIDENCE = [
    {
        title: "Earth Facts",
        source: "NASA Science",
        url: "https://science.nasa.gov/earth/facts/",
        publishedAt: null,
        content:
            "NASA describes Earth as the third planet from the Sun and explains that it travels around the Sun as part of the solar system."
    },
    {
        title: "Earth Overview",
        source: "NASA Science",
        url: "https://science.nasa.gov/solar-system/planets/earth/overview/",
        publishedAt: null,
        content:
            "NASA's Earth overview identifies Earth as a planet in the solar system and provides its orbit around the Sun as part of its planetary facts."
    }
];

const DAILY_ARTICLES = [
    {
        id: "earth-orbits-sun",
        demoMode: true,
        title: "How scientists describe Earth's orbit",
        summary:
            "A stable science demo case with pre-collected NASA evidence for a live Gonka verification.",
        source: "NASA Science",
        platform: "Web",
        url: "https://science.nasa.gov/earth/facts/",
        publishedAt: null,
        claim: "The Earth orbits the Sun.",
        evidence: EARTH_EVIDENCE,
        verifiable: true,
        verificationStatus: "UNVERIFIED"
    },
    {
        id: "water-freezing-point",
        demoMode: true,
        title: "A familiar temperature claim",
        summary:
            "A prepared educational example that can be verified live when added to a future demo case.",
        source: "National Weather Service",
        platform: "Web",
        url: "https://www.weather.gov/",
        publishedAt: null,
        claim:
            "Water freezes at 0 degrees Celsius at standard atmospheric pressure.",
        evidence: [],
        verifiable: false,
        verificationStatus: "NOT VERIFIABLE"
    },
    {
        id: "context-required-example",
        demoMode: true,
        title: "Opinion and context example",
        summary:
            "This item demonstrates content that should not be labelled as fact-checked without a concrete factual claim.",
        source: "Prepared demo content",
        platform: "Demo",
        url: null,
        publishedAt: null,
        claim: null,
        evidence: [],
        verifiable: false,
        verificationStatus: "NOT VERIFIABLE"
    }
];

const TRENDING_TOPICS = [
    {
        id: "earth-science",
        demoMode: true,
        title: "Earth and space science",
        summary:
            "Prepared topics illustrate how InfoSauce groups information before a user requests a live fact check.",
        source: "NASA Science",
        platform: "Web",
        relatedArticleId: "earth-orbits-sun"
    },
    {
        id: "climate-literacy",
        demoMode: true,
        title: "Climate literacy resources",
        summary:
            "A stable prepared topic card for the public demo. It is not a live social-media trend.",
        source: "NOAA",
        platform: "Web",
        relatedArticleId: null
    },
    {
        id: "health-information",
        demoMode: true,
        title: "Health information literacy",
        summary:
            "Prepared reference material highlights the difference between a topic and a verifiable factual claim.",
        source: "World Health Organization",
        platform: "Web",
        relatedArticleId: "context-required-example"
    }
];

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function listTrending() {
    return clone(TRENDING_TOPICS);
}

function listDailyArticles() {
    return clone(DAILY_ARTICLES);
}

function getDailyArticle(id) {
    const article = DAILY_ARTICLES.find(item => item.id === id);
    return article ? clone(article) : null;
}

function getVerifiableCase(caseId) {
    const article = DAILY_ARTICLES.find(
        item => item.id === caseId && item.verifiable === true
    );

    if (!article || !article.claim || article.evidence.length === 0) {
        return null;
    }

    return {
        id: article.id,
        claim: article.claim,
        article: clone(article),
        evidence: clone(article.evidence),
        demoMode: true,
        notice: DEMO_NOTICE
    };
}

module.exports = {
    DEMO_NOTICE,
    getDailyArticle,
    getVerifiableCase,
    listDailyArticles,
    listTrending
};
