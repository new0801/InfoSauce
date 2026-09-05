import { afterEach, describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

afterEach(() => {
  vi.unstubAllGlobals();
  delete require.cache[require.resolve("./verifier")];
  delete require.cache[require.resolve("./gonka")];
});

describe("verifyClaim", () => {
  it("starts both configured Gonka model requests before either model resolves", async () => {
    const resolvers = [];
    const verificationJson = JSON.stringify({
      verdict: "TRUE",
      confidence: 0.9,
      reasoning: "Evidence supports the claim.",
      evidence: [{ evidenceIndex: 0, support: "Direct support." }],
    });
    const fetchMock = vi.fn(() => new Promise((resolve) => {
      resolvers.push(() => resolve({
        ok: true,
        headers: { get: (name) => (name === "x-request-id" ? `req-${resolvers.length}` : null) },
        json: async () => ({ id: `msg-${resolvers.length}`, content: [{ type: "text", text: verificationJson }] }),
      }));
    }));
    vi.stubGlobal("fetch", fetchMock);

    const { verifyClaim } = require("./verifier");
    const response = verifyClaim({
      claim: "A claim",
      title: "Title",
      content: "Content",
      sources: [],
      evidence: [{ title: "Evidence", content: "Evidence", source: "Source", url: "https://example.com" }],
    });

    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    resolvers.forEach(resolve => resolve());
    await expect(response).resolves.toMatchObject({ results: [{ requestId: "req-2" }, { requestId: "req-2" }] });
  });

  it("returns Gonka timeout when every verification model times out", async () => {
    const timeoutError = new Error("The operation was aborted due to timeout");
    timeoutError.name = "TimeoutError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(timeoutError));

    const { verifyClaim } = require("./verifier");
    await expect(verifyClaim({
      claim: "A claim",
      title: "Title",
      content: "Content",
      sources: [],
      evidence: [{ title: "Evidence", content: "Evidence", source: "Source", url: "https://example.com" }],
    })).rejects.toMatchObject({ code: "GONKA_TIMEOUT" });
  });

  it("retains a real Router request ID when that model's verification body cannot be parsed", async () => {
    const validJson = JSON.stringify({
      verdict: "TRUE",
      confidence: 0.9,
      reasoning: "Evidence supports the claim.",
      evidence: [{ evidenceIndex: 0, support: "Direct support." }],
    });
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: (name) => (name === "x-request-id" ? "req-unparsed" : null) },
        json: async () => ({ id: "msg-unparsed", content: [{ type: "text", text: "not JSON" }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: (name) => (name === "x-request-id" ? "req-valid" : null) },
        json: async () => ({ id: "msg-valid", content: [{ type: "text", text: validJson }] }),
      }));

    const { verifyClaim } = require("./verifier");
    await expect(verifyClaim({
      claim: "A claim",
      title: "Title",
      content: "Content",
      sources: [],
      evidence: [{ title: "Evidence", content: "Evidence", source: "Source", url: "https://example.com" }],
    })).resolves.toMatchObject({
      results: [{ requestId: "req-valid" }],
      failures: [{ requestId: "req-unparsed" }],
    });
  });

  it("marks verification as full when every configured model succeeds", async () => {
    const verificationJson = JSON.stringify({
      verdict: "TRUE", confidence: 0.9, reasoning: "Evidence supports the claim.",
      evidence: [{ evidenceIndex: 0, support: "Direct support." }],
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: (name) => (name === "x-request-id" ? "req-success" : null) },
      json: async () => ({ id: "msg-success", content: [{ type: "text", text: verificationJson }] }),
    }));

    const { verifyClaim } = require("./verifier");
    await expect(verifyClaim({
      claim: "A claim", title: "Title", content: "Content", sources: [],
      evidence: [{ title: "Evidence", content: "Evidence", source: "Source", url: "https://example.com" }],
    })).resolves.toMatchObject({
      mode: "full", degraded: false, successfulModels: 2, configuredModels: 2,
      failedModels: 0, failedModelNames: [], failureCategories: [],
    });
  });

  it("returns a safe degraded summary when one configured model times out", async () => {
    const verificationJson = JSON.stringify({
      verdict: "TRUE", confidence: 0.9, reasoning: "Evidence supports the claim.",
      evidence: [{ evidenceIndex: 0, support: "Direct support." }],
    });
    const timeoutError = new Error("provider detail that must not enter the summary");
    timeoutError.name = "TimeoutError";
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: (name) => (name === "x-request-id" ? "req-deepseek" : null) },
        json: async () => ({ id: "msg-deepseek", content: [{ type: "text", text: verificationJson }] }),
      })
      .mockRejectedValueOnce(timeoutError)
      .mockRejectedValueOnce(timeoutError));

    const { verifyClaim } = require("./verifier");
    const result = await verifyClaim({
      claim: "A claim", title: "Title", content: "Content", sources: [],
      evidence: [{ title: "Evidence", content: "Evidence", source: "Source", url: "https://example.com" }],
    });

    expect(result).toMatchObject({
      mode: "degraded", degraded: true, successfulModels: 1, configuredModels: 2,
      failedModels: 1, failedModelNames: ["MiniMaxAI/MiniMax-M2.7"],
      failureCategories: [{ model: "MiniMaxAI/MiniMax-M2.7", category: "timeout" }],
    });
    expect(JSON.stringify(result.failureCategories)).not.toContain("provider detail");
  });
});
