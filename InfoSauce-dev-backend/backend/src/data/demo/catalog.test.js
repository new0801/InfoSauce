const test = require("node:test");
const assert = require("node:assert/strict");

const {
    getVerifiableCase,
    listDailyArticles,
    listTrending
} = require("./catalog");

test("Earth demo case returns stable server-owned claim and evidence", () => {
    const item = getVerifiableCase("earth-orbits-sun");

    assert.equal(item.claim, "The Earth orbits the Sun.");
    assert.ok(item.evidence.length >= 2);
    assert.ok(
        item.evidence.every(({ title, source, url, content }) =>
            Boolean(title && source && url && content)
        )
    );
});

test("the demo catalog includes prepared Trending data", () => {
    const topics = listTrending();

    assert.ok(topics.length >= 3);
    assert.ok(topics.every(topic => topic.demoMode === true));
});

test("a NOT VERIFIABLE Daily item cannot become a Gonka case", () => {
    const article = listDailyArticles().find(
        item => item.verificationStatus === "NOT VERIFIABLE"
    );

    assert.ok(article);
    assert.equal(getVerifiableCase(article.id), null);
});
