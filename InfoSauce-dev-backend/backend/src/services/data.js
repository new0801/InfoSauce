async function getNewsByTopic(topic) {
    if (
        !topic ||
        typeof topic !== "string" ||
        topic.trim() === ""
    ) {
        throw new Error("data.js: Topic must be a non-empty string");
    }

    const url =
        `${process.env.DATA_API_URL}/api/news?topic=` +
        encodeURIComponent(topic.trim());

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `Data service failed with status ${response.status}`
        );
    }

    const data = await response.json();

    return data;
}


async function getNewsByArea(area) {
    if (
        !area ||
        typeof area !== "string" ||
        area.trim() === ""
    ) {
        throw new Error("data.js: Area must be a non-empty string");
    }

    const url =
        `${process.env.DATA_API_URL}/api/news?area=` +
        encodeURIComponent(area.trim());

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `Data service failed with status ${response.status}`
        );
    }

    const data = await response.json();

    return data;
}

async function searchNews(query) {
    if (
        !query ||
        typeof query !== "string" ||
        query.trim() === ""
    ) {
        throw new Error("data.js: Query must be a non-empty string");
    }

    const url =
        `${process.env.DATA_API_URL}/api/news?query=` +
        encodeURIComponent(query.trim());

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `Data service failed with status ${response.status}`
        );
    }

    const data = await response.json();

    if (!data || !Array.isArray(data.news)) {
        throw new Error(
            "data.js: Research response does not contain a news array"
        );
    }

    return data.news;
}

module.exports = {
    getNewsByTopic,
    getNewsByArea,
    searchNews
};