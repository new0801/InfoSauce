import { describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { ContentExtractionError, extractPublicPage } = require("./contentExtraction");

const publicLookup = async () => [{ address: "93.184.216.34", family: 4 }];

describe("extractPublicPage", () => {
  it("extracts the actual title and visible article text from a public HTML page", async () => {
    const page = await extractPublicPage("https://example.com/article", {
      lookup: publicLookup,
      fetch: vi.fn().mockResolvedValue(new Response(`
        <html><head><title>Example article</title><style>.x {}</style></head>
        <body><nav>Navigation</nav><article><h1>Headline</h1><p>The Earth orbits the Sun.</p><p>This is independently readable article content.</p></article><script>ignored()</script></body></html>
      `, { headers: { "content-type": "text/html" } })),
    });

    expect(page).toMatchObject({
      originalUrl: "https://example.com/article",
      resolvedUrl: "https://example.com/article",
      title: "Example article",
    });
    expect(page.content).toContain("The Earth orbits the Sun.");
    expect(page.content).not.toContain("Navigation");
    expect(page.content).not.toContain("ignored()");
  });

  it("rejects malformed, credentialed, and localhost/private URLs before fetching", async () => {
    const fetch = vi.fn();
    for (const url of ["not a url", "https://user:pass@example.com", "http://localhost/a", "http://127.0.0.1/a", "http://192.168.1.1/a"]) {
      await expect(extractPublicPage(url, { fetch, lookup: publicLookup })).rejects.toBeInstanceOf(ContentExtractionError);
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("validates redirect targets before fetching them", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, {
      status: 302,
      headers: { location: "http://127.0.0.1/private" },
    }));

    await expect(extractPublicPage("https://example.com/redirect", { fetch, lookup: publicLookup }))
      .rejects.toMatchObject({ code: "URL_BLOCKED" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("rejects timed-out, oversized, and non-HTML responses", async () => {
    const timeout = new Error("The operation was aborted due to timeout");
    timeout.name = "TimeoutError";
    await expect(extractPublicPage("https://example.com/slow", { fetch: vi.fn().mockRejectedValue(timeout), lookup: publicLookup }))
      .rejects.toMatchObject({ code: "URL_TIMEOUT" });
    await expect(extractPublicPage("https://example.com/large", {
      lookup: publicLookup,
      fetch: vi.fn().mockResolvedValue(new Response("small", { headers: { "content-type": "text/html", "content-length": "1048577" } })),
    })).rejects.toMatchObject({ code: "URL_TOO_LARGE" });
    await expect(extractPublicPage("https://example.com/file.pdf", {
      lookup: publicLookup,
      fetch: vi.fn().mockResolvedValue(new Response("%PDF", { headers: { "content-type": "application/pdf" } })),
    })).rejects.toMatchObject({ code: "URL_NON_HTML" });
  });
});
