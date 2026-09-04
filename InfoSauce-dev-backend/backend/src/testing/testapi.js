// Test the InfoSauce Category API endpoint

async function testAPI() {

    try {

        const response = await fetch(
            "http://localhost:3000/api/category",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    area: "Space"
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