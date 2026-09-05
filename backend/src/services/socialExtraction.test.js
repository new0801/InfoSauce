import { describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { SocialExtractionError, detectSocialUrl, extractSocialPost } = require("./socialExtraction");

describe("detectSocialUrl", () => {
  it("recognizes X and Twitter status URLs by exact status ID", () => {
    expect(detectSocialUrl("https://x.com/example/status/123456789")).toEqual({ platform: "x", id: "123456789" });
    expect(detectSocialUrl("https://twitter.com/example/status/987654321?ref=share")).toEqual({ platform: "x", id: "987654321" });
  });

  it("recognizes Reddit submission URLs and rejects malformed social paths", () => {
    expect(detectSocialUrl("https://www.reddit.com/r/news/comments/1abcde/a_post/")).toEqual({ platform: "reddit", id: "1abcde" });
    expect(() => detectSocialUrl("https://x.com/example/status/not-a-number")).toThrow(SocialExtractionError);
    expect(() => detectSocialUrl("https://www.reddit.com/r/news/comments/")).toThrow(SocialExtractionError);
  });
});

describe("extractSocialPost", () => {
  it("uses only the X item that exactly matches the submitted status ID", async () => {
    const runner = vi.fn().mockResolvedValue(JSON.stringify([
      { id: "123456789", text: "Original post text.", author: "example", url: "https://x.com/example/status/123456789", created_at: "2026-09-05T00:00:00.000Z" },
      { id: "123456790", text: "Reply text that must not be used.", author: "reply", url: "https://x.com/reply/status/123456790" },
    ]));

    const page = await extractSocialPost("https://twitter.com/example/status/123456789", { runOpenCli: runner });

    expect(runner).toHaveBeenCalledWith("twitter", ["thread", "123456789", "-f", "json"]);
    expect(page).toMatchObject({ platform: "x", title: "Original post text.", content: "Original post text.", author: "example", resolvedUrl: "https://x.com/example/status/123456789" });
    expect(page.content).not.toContain("Reply text");
  });

  it("normalizes only the submitted Reddit post title and self-text", async () => {
    const runner = vi.fn().mockResolvedValue(JSON.stringify({
      post: { id: "1abcde", title: "Post title", selftext: "Actual submission body.", author: "poster", subreddit: "news", permalink: "/r/news/comments/1abcde/a_post/", created_utc: 1_788_940_800 },
      comments: [{ id: "t1-reply", body: "Comment text that must not be used.", author: "commenter" }],
    }));

    const page = await extractSocialPost("https://www.reddit.com/r/news/comments/1abcde/a_post/", { runOpenCli: runner });

    expect(runner).toHaveBeenCalledWith("reddit", ["read", "1abcde", "-f", "json"]);
    expect(page).toMatchObject({ platform: "reddit", title: "Post title", content: "Post title\n\nActual submission body.", author: "poster", source: "r/news · u/poster" });
    expect(page.content).not.toContain("Comment text");
  });

  it("uses the real OpenCLI POST record when Reddit returns combined post text without IDs", async () => {
    const runner = vi.fn().mockResolvedValue(JSON.stringify([
      { type: "POST", author: "poster", text: "Observed title\n\nObserved submission body." },
      { type: "L0", author: "commenter", text: "Comment text that must not be used." },
    ]));

    const page = await extractSocialPost("https://www.reddit.com/r/news/comments/1abcde/a_post/", { runOpenCli: runner });

    expect(page).toMatchObject({ title: "Observed title", content: "Observed title\n\nObserved submission body.", source: "Reddit · u/poster" });
    expect(page.content).not.toContain("Comment text");
  });

  it("returns a safe extraction failure when an exact post is unavailable", async () => {
    await expect(extractSocialPost("https://x.com/example/status/123456789", { runOpenCli: vi.fn().mockResolvedValue(JSON.stringify([])) }))
      .rejects.toMatchObject({ code: "SOCIAL_UNAVAILABLE" });
    await expect(extractSocialPost("https://www.reddit.com/r/news/comments/1abcde/a_post/", { runOpenCli: vi.fn().mockRejectedValue(new Error("AUTH_REQUIRED token=secret")) }))
      .rejects.toMatchObject({ code: "SOCIAL_UNAVAILABLE" });
  });
});
