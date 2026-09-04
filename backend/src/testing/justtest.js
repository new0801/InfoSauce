async function test() {
    try {
        const response = await fetch(
            "http://localhost:3000/api/test-gonka-ids"
        );

        console.log("STATUS:", response.status);
        console.log("CONTENT TYPE:", response.headers.get("content-type"));

        const text = await response.text();

        console.log("RAW RESPONSE:");
        console.log(text);

    } catch (error) {
        console.error("Test failed:", error.message);
    }
}

test();