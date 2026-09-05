import { describe, expect, it } from "vitest";
import { dailyCardTitle } from "./dailyPresentation";

describe("dailyCardTitle", () => {
  it("uses the concise extracted claim as the Daily card heading instead of a long original title", () => {
    expect(dailyCardTitle({
      title: "A very long original social-media title that should remain available as article metadata rather than becoming the card headline.",
      headline: "OpenAI released a new safety report.",
      claim: "OpenAI released a new safety report.",
    })).toBe("OpenAI released a new safety report.");
  });
});
