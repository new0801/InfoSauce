import { afterEach, describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

afterEach(() => {
  vi.unstubAllGlobals();
  delete require.cache[require.resolve("./gonka")];
});

describe("askGonkaPrompt", () => {
  it("forwards the requested token limit to GonkaRouter", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ type: "text", text: "{}" }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { askGonkaPrompt } = require("./gonka");
    await askGonkaPrompt("Return JSON.", "test-model", 1024);

    const [, request] = fetchMock.mock.calls[0];
    expect(JSON.parse(request.body).max_tokens).toBe(1024);
  });

  it("waits for GonkaRouter's Retry-After interval before retrying a 429", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: { get: (name) => (name === "retry-after" ? "5" : null) },
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: [{ type: "text", text: "{}" }] }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const { askGonkaPrompt } = require("./gonka");
    const result = askGonkaPrompt("Return JSON.", "test-model");

    await vi.advanceTimersByTimeAsync(4_999);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toEqual({
      content: [{ type: "text", text: "{}" }],
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries one transient Gonka timeout with the existing backoff", async () => {
    vi.useFakeTimers();
    const timeoutError = new Error("The operation was aborted due to timeout");
    timeoutError.name = "TimeoutError";
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(timeoutError)
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => null },
        json: async () => ({ id: "msg-retried", content: [{ type: "text", text: "{}" }] }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const { askGonkaPrompt } = require("./gonka");
    const request = askGonkaPrompt("Return JSON.", "test-model", 64);
    await vi.advanceTimersByTimeAsync(2000);

    await expect(request).resolves.toMatchObject({ id: "msg-retried" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("classifies a Router HTTP failure instead of reporting it as a timeout", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      headers: { get: () => null },
    });
    vi.stubGlobal("fetch", fetchMock);

    const { askGonkaPrompt } = require("./gonka");
    await expect(askGonkaPrompt("Return JSON.", "test-model", 64)).rejects.toMatchObject({
      code: "GONKA_HTTP_ERROR",
      status: 502,
    });
  });

  it("classifies a network failure instead of reporting it as a timeout", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);

    const { askGonkaPrompt } = require("./gonka");
    await expect(askGonkaPrompt("Return JSON.", "test-model", 64)).rejects.toMatchObject({
      code: "GONKA_NETWORK_ERROR",
    });
  });
});

describe("askGonka", () => {
  it("uses the MiniMax-specific output budget and returns GonkaRouter's x-request-id", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: (name) => (name === "x-request-id" ? "req-router-trace" : null) },
      json: async () => ({
        id: "msg_message-object",
        content: [{ type: "text", text: "{}" }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { askGonka } = require("./gonka");
    const result = await askGonka(
      { claim: "A claim", title: "Title", content: "Content", sources: [], evidence: [] },
      "MiniMaxAI/MiniMax-M2.7",
    );

    expect(result.id).toBe("msg_message-object");
    expect(result.requestId).toBe("req-router-trace");
    const [, request] = fetchMock.mock.calls[0];
    expect(JSON.parse(request.body).max_tokens).toBe(2048);
  });

  it("keeps the existing output budget for non-MiniMax verification models", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => null },
      json: async () => ({ id: "msg-deepseek", content: [{ type: "text", text: "{}" }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { askGonka } = require("./gonka");
    await askGonka(
      { claim: "A claim", title: "Title", content: "Content", sources: [], evidence: [] },
      "deepseek-ai/DeepSeek-V4-Flash-0731",
    );

    const [, request] = fetchMock.mock.calls[0];
    expect(JSON.parse(request.body).max_tokens).toBe(1024);
  });
});
