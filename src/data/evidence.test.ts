import { describe, expect, it } from "vitest";
import { findSourceById } from "./sources";
import { findEvidenceById } from "./evidence";
import { findFactCheckById } from "./factCheck";
import { calculateSupportPercentage } from "./evidence";
import { getEvidenceForFactCheck } from "./evidence";
import { summarizeEvidence } from "./evidence";

describe("source lookup", () => {
  it("finds a source by source ID", () => {
    const source = findSourceById("SRC001");

    expect(source).toBeDefined();
    expect(source?.id).toBe("SRC001");
  });

  it("returns undefined for an unknown source ID", () => {
    const source = findSourceById("SRC999");

    expect(source).toBeUndefined();
  });
});

describe("evidence and fact check lookup", () => {
  it("finds evidence by evidence ID", () => {
    const item = findEvidenceById("EV001");

    expect(item).toBeDefined();
    expect(item?.id).toBe("EV001");
  });

  it("finds fact check by fact check ID", () => {
    const factCheck = findFactCheckById("FC001");

    expect(factCheck).toBeDefined();
    expect(factCheck?.id).toBe("FC001");
  });

  it("links fact check to its evidence", () => {
    const factCheck = findFactCheckById("FC001");

    expect(factCheck?.evidenceIds).toContain("EV001");
    expect(factCheck?.evidenceIds).toContain("EV002");
  });
});

describe("support percentage", () => {
  it("calculates support percentage using evidence relevance", () => {
    const items = [
      {
        id: "EV001",
        factCheckId: "FC001",
        sourceId: "SRC001",
        content: "Supporting evidence",
        relevance: 80,
        relationship: "supporting" as const,
        publishedAt: "2026-08-30",
      },
      {
        id: "EV002",
        factCheckId: "FC001",
        sourceId: "SRC002",
        content: "Contradicting evidence",
        relevance: 20,
        relationship: "contradicting" as const,
        publishedAt: "2026-08-30",
      },
    ];

    expect(calculateSupportPercentage(items)).toBe(80);
  });

  it("returns 0 when there is no evidence", () => {
    expect(calculateSupportPercentage([])).toBe(0);
  });
});

describe("fact check evidence lookup", () => {
  it("gets all evidence for a fact check", () => {
    const items = getEvidenceForFactCheck("FC001");

    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.factCheckId === "FC001")).toBe(true);
  });

  it("returns an empty array for an unknown fact check", () => {
    expect(getEvidenceForFactCheck("FC999")).toEqual([]);
  });
});
describe("evidence summary", () => {
  it("summarizes evidence relationships", () => {
    const items = [
      {
        id: "EV001",
        factCheckId: "FC001",
        sourceId: "SRC001",
        content: "Supporting evidence",
        relevance: 80,
        relationship: "supporting" as const,
        publishedAt: "2026-08-30",
      },
      {
        id: "EV002",
        factCheckId: "FC001",
        sourceId: "SRC002",
        content: "Contradicting evidence",
        relevance: 20,
        relationship: "contradicting" as const,
        publishedAt: "2026-08-30",
      },
      {
        id: "EV003",
        factCheckId: "FC001",
        sourceId: "SRC003",
        content: "Neutral evidence",
        relevance: 0,
        relationship: "neutral" as const,
        publishedAt: "2026-08-30",
      },
    ];

    const summary = summarizeEvidence(items);

    expect(summary.total).toBe(3);
    expect(summary.supporting).toBe(1);
    expect(summary.contradicting).toBe(1);
    expect(summary.neutral).toBe(1);
    expect(summary.supportPercentage).toBe(80);
  });
});
