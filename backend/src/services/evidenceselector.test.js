import { afterEach, describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

afterEach(() => {
  vi.unstubAllGlobals();
  delete require.cache[require.resolve("./evidenceselector")];
  delete require.cache[require.resolve("./gonka")];
});

describe("selectEvidence", () => {
  it("bounds selection context while allowing enough output for its JSON result", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "req-selection" },
      json: async () => ({ id: "msg-selection", content: [{ type: "text", text: '{"selectedEvidence":[0]}' }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { selectEvidence } = require("./evidenceselector");
    await selectEvidence("OpenAI released a report.", Array.from({ length: 8 }, (_, index) => ({
      title: `OpenAI report ${index}`,
      content: "OpenAI released a report. ".repeat(40),
      source: "Example",
      url: `https://example.com/${index}`,
    })));

    const [, request] = fetchMock.mock.calls[0];
    const body = JSON.parse(request.body);
    expect(body.max_tokens).toBe(512);
    expect((body.messages[0].content.match(/Evidence \d+:/g) || [])).toHaveLength(3);
  });

  it("retries a real evidence selection request once when Gonka returns non-JSON text", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => "req-first" },
        json: async () => ({ id: "msg-first", content: [{ type: "text", text: "<think>still reasoning" }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => "req-second" },
        json: async () => ({ id: "msg-second", content: [{ type: "text", text: '{"selectedEvidence":[0]}' }] }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const { selectEvidence } = require("./evidenceselector");
    const result = await selectEvidence("OpenAI released a report.", [{
      title: "OpenAI report",
      content: "OpenAI released a report.",
      source: "Example",
      url: "https://example.com",
    }]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.results[0].selectedEvidence).toEqual([0]);
  });

  it("uses relevance-ranked fallback evidence only after selector request parsing fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "req-malformed-selection" },
      json: async () => ({ id: "msg-malformed-selection", content: [{ type: "text", text: "not JSON" }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { selectEvidence } = require("./evidenceselector");
    const result = await selectEvidence("OpenAI released a new safety report in 2026.", [
      { title: "OpenAI releases 2026 safety report", content: "OpenAI released a new safety report in 2026 with evaluation details.", source: "OpenAI", url: "https://example.com/openai" },
      { title: "Football scores", content: "A football club won its latest match.", source: "Sports", url: "https://example.com/sports" },
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.results[0]).toMatchObject({
      model: "fallback_relevance",
      selectedEvidence: [0],
      selectionReason: "fallback_relevance",
    });
  });

  it("respects an explicit empty model selection instead of forcing lexical matches into verification", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "req-empty" },
      json: async () => ({ id: "msg-empty", content: [{ type: "text", text: '{"selectedEvidence":[]}' }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { selectEvidence } = require("./evidenceselector");
    const result = await selectEvidence("Richard Nixon discussed a four-day workweek in 1956.", [
      { title: "Nixon technology discussion", content: "Workers discussed Nixon and productivity in a modern social post.", source: "Social", url: "https://example.com/social" },
    ]);

    expect(result.results[0]).toMatchObject({
      model: "deepseek-ai/DeepSeek-V4-Flash-0731",
      selectedEvidence: [],
    });
  });
});
