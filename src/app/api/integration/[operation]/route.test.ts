import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";

type ProxyRoute = {
  POST: (
    request: Request,
    context: { params: Promise<{ operation: string }> },
  ) => Promise<Response>;
};

const originalAiServiceUrl = process.env.AI_SERVICE_URL;
const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  })));

  if (originalAiServiceUrl === undefined) {
    delete process.env.AI_SERVICE_URL;
  } else {
    process.env.AI_SERVICE_URL = originalAiServiceUrl;
  }
});

describe("AI service proxy", () => {
  it("forwards a category request body and preserves the AI service response", async () => {
    let received: { method?: string; url?: string; body?: unknown } | undefined;
    const server = createServer(async (request, response) => {
      let body = "";
      for await (const chunk of request) body += chunk;
      received = { method: request.method, url: request.url, body: JSON.parse(body) };
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ success: true, results: [{ claim: "A factual claim" }] }));
    });
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Fixture server did not expose a TCP port");
    process.env.AI_SERVICE_URL = `http://127.0.0.1:${address.port}`;

    const route = await import("./route") as ProxyRoute;
    const response = await route.POST(
      new Request("http://localhost/api/integration/category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ areas: ["World"] }),
      }),
      { params: Promise.resolve({ operation: "category" }) },
    );

    expect(received).toEqual({ method: "POST", url: "/api/category", body: { areas: ["World"] } });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, results: [{ claim: "A factual claim" }] });
  });

  it("returns 503 when the AI service cannot be reached", async () => {
    process.env.AI_SERVICE_URL = "http://127.0.0.1:1";
    const route = await import("./route") as ProxyRoute;

    const response = await route.POST(
      new Request("http://localhost/api/integration/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim: "A factual claim", sources: [], evidence: [] }),
      }),
      { params: Promise.resolve({ operation: "verify" }) },
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "AI service is unavailable" });
  });

  it("forwards a Daily retry only to the single-article verification endpoint", async () => {
    let received: { url?: string; body?: unknown } | undefined;
    const server = createServer(async (request, response) => {
      let body = "";
      for await (const chunk of request) body += chunk;
      received = { url: request.url, body: JSON.parse(body) };
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ success: true, article: { id: "twitter:1", verificationStatus: "verified" } }));
    });
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Fixture server did not expose a TCP port");
    process.env.AI_SERVICE_URL = `http://127.0.0.1:${address.port}`;

    const route = await import("./route") as ProxyRoute;
    const article = { id: "twitter:1", claim: "A claim", evidence: [{ content: "Evidence" }], truthScore: { truthScore: 99 } };
    const response = await route.POST(
      new Request("http://localhost/api/integration/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retryArticleId: "twitter:1", article }),
      }),
      { params: Promise.resolve({ operation: "daily" }) },
    );

    expect(received).toEqual({ url: "/api/daily/twitter%3A1/verify", body: { article } });
    await expect(response.json()).resolves.toMatchObject({ article: { verificationStatus: "verified" } });
  });
});
