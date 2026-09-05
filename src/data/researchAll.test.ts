import { describe, expect, it, vi } from "vitest";

vi.mock("./research/twitter", () => ({ searchTwitter: vi.fn() }));
vi.mock("./research/reddit", () => ({ searchReddit: vi.fn() }));
vi.mock("./research/youtube", () => ({ searchYouTube: vi.fn() }));
vi.mock("./research/bilibili", () => ({ searchBilibili: vi.fn() }));
vi.mock("./research/xhs", () => ({ searchXhs: vi.fn() }));
vi.mock("./research/exa", () => ({ searchExa: vi.fn() }));

import { searchBilibili } from "./research/bilibili";
import { searchExa } from "./research/exa";
import { searchReddit } from "./research/reddit";
import { searchTwitter } from "./research/twitter";
import { searchXhs } from "./research/xhs";
import { searchYouTube } from "./research/youtube";
import { researchAll } from "./researchAll";

describe("researchAll", () => {
  it("keeps normalized results from successful platforms when another platform is unavailable", async () => {
    const twitterItem = {
      id: "tweet-1",
      title: "OpenAI releases a new model",
      content: "OpenAI announced a new AI model.",
      url: "https://x.com/openai/status/1",
      source: "OpenAI on X",
      sourceType: "social_media" as const,
      publishedAt: "2026-09-01T00:00:00.000Z",
      platform: "twitter" as const,
    };

    vi.mocked(searchTwitter).mockResolvedValue({ platform: "twitter", items: [twitterItem] });
    vi.mocked(searchReddit).mockResolvedValue({ platform: "reddit", items: [], unavailable: "Reddit login is required" });
    vi.mocked(searchYouTube).mockResolvedValue({ platform: "youtube", items: [] });
    vi.mocked(searchBilibili).mockResolvedValue({ platform: "bilibili", items: [] });
    vi.mocked(searchXhs).mockResolvedValue({ platform: "xhs", items: [] });
    vi.mocked(searchExa).mockResolvedValue({ platform: "exa", items: [] });

    const result = await researchAll("OpenAI model");

    expect(result.news).toEqual([
      expect.objectContaining({
        id: "twitter:tweet-1",
        title: "OpenAI releases a new model",
        area: "AI & Technology",
        topic: "AI",
        platform: "twitter",
      }),
    ]);
    expect(result.unavailablePlatforms).toEqual([
      { platform: "reddit", unavailable: "Reddit login is required" },
    ]);
    expect(result.platformResults).toHaveLength(6);
  });
});
