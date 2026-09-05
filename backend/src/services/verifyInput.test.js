import { describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { verifyTypedInput } = require("./verifyInput");

describe("verifyTypedInput", () => {
  it("sends extracted URL page content through claim extraction and the shared verifier", async () => {
    const extractClaim = vi.fn().mockResolvedValue({ hasClaim: true, claim: "The Earth orbits the Sun." });
    const verifyExtractedClaim = vi.fn().mockResolvedValue({ verificationStatus: "completed", consensus: { verdict: "TRUE" } });
    const result = await verifyTypedInput({ type: "url", content: "https://example.com/article" }, {
      extractPublicPage: vi.fn().mockResolvedValue({
        originalUrl: "https://example.com/article", resolvedUrl: "https://www.example.com/article",
        title: "Earth facts", content: "The Earth orbits the Sun. Additional page text.",
      }),
      extractClaim,
      verifyExtractedClaim,
    });

    expect(extractClaim).toHaveBeenCalledWith("The Earth orbits the Sun. Additional page text.");
    expect(verifyExtractedClaim).toHaveBeenCalledWith("The Earth orbits the Sun.", expect.objectContaining({
      article: expect.objectContaining({
        url: "https://example.com/article",
        canonicalUrl: "https://www.example.com/article",
        title: "Earth facts",
      }),
    }));
    expect(result).toMatchObject({ success: true, input: { type: "url" }, claimStatus: "completed" });
  });

  it("returns a stage-specific failure for an unsupported social URL and image input", async () => {
    await expect(verifyTypedInput({ type: "url", content: "https://youtube.com/watch?v=1" }))
      .resolves.toMatchObject({ success: false, stage: "content_extraction", status: "unsupported" });
    await expect(verifyTypedInput({ type: "image", file: { name: "claim.png", type: "image/png", size: 42 } }))
      .resolves.toMatchObject({ success: false, stage: "content_extraction", status: "unsupported" });
  });

  it.each([
    ["https://x.com/example/status/123456789", "x"],
    ["https://www.reddit.com/r/news/comments/1abcde/a_post/", "reddit"],
  ])("sends exact %s content through the existing claim extractor and shared verifier", async (url, platform) => {
    const extractClaim = vi.fn().mockResolvedValue({ hasClaim: true, claim: "A factual claim." });
    const verifyExtractedClaim = vi.fn().mockResolvedValue({ verificationStatus: "completed" });
    const extractSocialPost = vi.fn().mockResolvedValue({ originalUrl: url, resolvedUrl: url, platform, title: "Real post", content: "Real exact post content.", source: "Author" });

    await verifyTypedInput({ type: "url", content: url }, { extractClaim, extractSocialPost, verifyExtractedClaim });

    expect(extractSocialPost).toHaveBeenCalledWith(url);
    expect(extractClaim).toHaveBeenCalledWith("Real exact post content.");
    expect(verifyExtractedClaim).toHaveBeenCalledWith("A factual claim.", expect.objectContaining({ article: expect.objectContaining({ platform, content: "Real exact post content." }) }));
  });
});
