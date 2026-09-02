// Test the InfoSauce API endpoint

async function testAPI() {

    try {

        const response = await fetch(
            "http://localhost:3000/api/verify",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    newsId: "test-001",

                    title: "Example fact-check",

                    content: "The Earth is flat according to this post.",

                    claim: "The Earth is flat.",

                    sources: [
                        "https://example.com/source1"
                    ],

                    evidence: [
                        "Scientific measurements and observations demonstrate that Earth is approximately spherical."
                    ]
                })
            }
        );

        console.log("HTTP STATUS:", response.status);

        const data = await response.json();

        console.log("===== API RESPONSE =====");
        console.log(JSON.stringify(data, null, 2));
        console.log("========================");

    } catch (error) {

        console.error("API request failed:", error);

    }
}

testAPI();