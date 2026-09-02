async function test() {
    const title =
        "This week's lunar eclipse proves Earth isn't flat";

    const searchUrl =
        "https://www.google.com/search?" +
        new URLSearchParams({
            q: `"${title}"`
        });

    try {
        const response = await fetch(searchUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0"
            }
        });

        console.log("HTTP STATUS:", response.status);
        console.log("FINAL URL:", response.url);

        const html = await response.text();

        console.log("\nHTML LENGTH:", html.length);

        console.log("\n===== SEARCH RESULTS CONTAINING TITLE =====");

        const lowerHtml = html.toLowerCase();
        const lowerTitle = title.toLowerCase();

        const position = lowerHtml.indexOf(lowerTitle);

        if (position === -1) {
            console.log("Title was not found in Google search HTML.");
        } else {
            console.log(
                html.slice(
                    Math.max(0, position - 2000),
                    position + 5000
                )
            );
        }

    } catch (error) {
        console.error("Search failed:", error);
    }
}

test();