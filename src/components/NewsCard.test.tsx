import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import NewsCard from "./NewsCard";

describe("NewsCard", () => {
  it("shows platform metadata when a research result provides it", () => {
    const markup = renderToStaticMarkup(
      <NewsCard
        category="AI"
        title="Article"
        summary="Summary"
        content="Content"
        status="Unverified"
        sources={1}
        platform="twitter"
        verificationState="Verification unavailable — Gonka timeout"
      />,
    );

    expect(markup).toContain("Platform: X");
    expect(markup).not.toContain("Platform: twitter");
    expect(markup).toContain("Verification unavailable — Gonka timeout");
  });

  it("shows a retry action only when Daily supplies a retry handler", () => {
    const retryMarkup = renderToStaticMarkup(
      <NewsCard
        category="AI"
        title="Timed out article"
        summary="Summary"
        content="Content"
        status="Unverified"
        sources={1}
        onRetryVerification={() => undefined}
      />,
    );
    const verifiedMarkup = renderToStaticMarkup(
      <NewsCard category="AI" title="Verified article" summary="Summary" content="Content" status="Verified" sources={1} />,
    );

    expect(retryMarkup).toContain("↻ Retry verification");
    expect(verifiedMarkup).not.toContain("Retry verification");
  });
});
