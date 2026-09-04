async function test() {
    const articleId =
        "CBMijgFBVV95cUxOckdCcWZiZUNBZ0NidFo3clV2cUx4a2RhWWstUmdicmVIaTA2QUEtRUtrNWVUbEtfemh6UkRfNDJVTkZKYUdtcjRTNVZobFZUd2xGb3JpNm9jZGNvNE5MSUxBOXRyM2tDUHhuRmlzdTBqU3BoUVpBR2FrTlh5X3M3QXVMZmdRamVlRHZqZlFR";

    const url =
        `https://news.google.com/articles/${articleId}`;

    try {
        const response = await fetch(url, {
            redirect: "follow",
            headers: {
                "User-Agent": "Mozilla/5.0"
            }
        });

        console.log("REQUEST URL:");
        console.log(url);

        console.log("\nFINAL URL:");
        console.log(response.url);

        console.log("\nHTTP STATUS:");
        console.log(response.status);

        const html = await response.text();

        console.log("\nHTML LENGTH:");
        console.log(html.length);

        console.log("\n===== FIRST 3000 CHARACTERS =====");
        console.log(html.slice(0, 3000));

    } catch (error) {
        console.error("Test failed:", error);
    }
}

test();