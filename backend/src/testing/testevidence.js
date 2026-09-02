async function test() {

    const claim = "The Earth is flat";

    const url =
        "https://news.google.com/rss/search?q=" +
        encodeURIComponent(claim) +
        "&hl=en-US&gl=US&ceid=US:en";

    try {

        const response = await fetch(url);

        console.log("HTTP STATUS:", response.status);

        const text = await response.text();

        console.log("===== GOOGLE NEWS RESPONSE =====");
        console.log(text.slice(0, 5000));
        console.log("================================");

    } catch (error) {

        console.error("Google News request failed:", error);
    }
}

test();