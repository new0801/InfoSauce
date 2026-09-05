const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");

const { createDemoRouter } = require("./demo");
const app = require("../app");

function request(app, method, path) {
    return new Promise((resolve, reject) => {
        const server = app.listen(0, "127.0.0.1", () => {
            const { port } = server.address();
            const clientRequest = http.request(
                {
                    host: "127.0.0.1",
                    port,
                    method,
                    path
                },
                response => {
                    let body = "";

                    response.setEncoding("utf8");
                    response.on("data", chunk => {
                        body += chunk;
                    });
                    response.on("end", () => {
                        server.close(error => {
                            if (error) {
                                reject(error);
                                return;
                            }

                            resolve({
                                status: response.statusCode,
                                body: JSON.parse(body)
                            });
                        });
                    });
                }
            );

            clientRequest.on("error", error => {
                server.close(() => reject(error));
            });
            clientRequest.end();
        });
    });
}

function createTestApp() {
    const app = express();

    app.use(
        "/api/demo",
        createDemoRouter({
            verifyClaim: async () => ({
                results: [
                    {
                        model: "DeepSeek",
                        requestId: "req_demo_deepseek",
                        result: {
                            verdict: "TRUE",
                            confidence: 0.95,
                            reasoning: "Prepared NASA evidence supports the claim.",
                            evidence: [
                                {
                                    evidenceIndex: 0,
                                    support: "NASA identifies Earth as a planet orbiting the Sun."
                                }
                            ]
                        }
                    }
                ],
                failures: [
                    {
                        model: "MiniMax",
                        status: "failed",
                        error: "timeout"
                    }
                ]
            }),
            calculateConsensus: () => ({
                verdict: "UNCERTAIN",
                consensusReached: false,
                totalModels: 2,
                totalVotes: 1,
                failedModels: 1
            }),
            calculateTruthScore: () => ({
                truthScore: 80
            }),
            configuredModelCount: 2
        })
    );

    return app;
}

test("demo Daily endpoint returns prepared data without live research", async () => {
    const response = await request(createTestApp(), "GET", "/api/demo/daily");

    assert.equal(response.status, 200);
    assert.equal(response.body.demoMode, true);
    assert.ok(response.body.articles.length >= 3);
});

test("the exported backend app exposes demo Daily", async () => {
    const response = await request(app, "GET", "/api/demo/daily");

    assert.equal(response.status, 200);
    assert.equal(response.body.demoMode, true);
});

test("unknown demo verification case returns a safe error", async () => {
    const response = await request(
        createTestApp(),
        "POST",
        "/api/demo/verify/not-a-case"
    );

    assert.equal(response.status, 404);
    assert.equal(response.body.error.code, "DEMO_CASE_NOT_FOUND");
});

test("Earth verification uses server-owned evidence and preserves degraded status", async () => {
    const response = await request(
        createTestApp(),
        "POST",
        "/api/demo/verify/earth-orbits-sun"
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.claim, "The Earth orbits the Sun.");
    assert.ok(response.body.evidence.length >= 2);
    assert.equal(response.body.verificationSummary.mode, "degraded");
    assert.equal(response.body.verificationSummary.successfulModels, 1);
    assert.deepEqual(
        response.body.verificationTrace,
        [{ model: "DeepSeek", requestId: "req_demo_deepseek" }]
    );
});
