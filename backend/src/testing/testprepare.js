const { prepareAiInput } = require("../services/prepareAIInput");

const newsItem = {
    id: "test:1",
    title: "NASA announced that humans will land on Mars in 2030.",
    content: "A social media post claims NASA announced a Mars landing in 2030.",
    url: "https://example.com/social-post"
};

const evidence = [
    {
        title: "NASA Mars Exploration",
        content: "NASA's official information about future Mars exploration.",
        source: "NASA",
        url: "https://www.nasa.gov/mars/",
        publishedAt: "2026-01-01",
        platform: "exa"
    },
    {
        title: "Mars Mission Report",
        content: "A report discussing plans for human exploration of Mars.",
        source: "Example News",
        url: "https://example.com/mars",
        publishedAt: "2026-02-01",
        platform: "exa"
    }
];

const result = prepareAiInput(
    newsItem,
    evidence
);

console.log(
    JSON.stringify(result, null, 2)
);