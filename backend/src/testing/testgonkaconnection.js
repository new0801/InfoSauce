require("dotenv").config();

async function testConnection() {
    try {
        console.log("Testing Node.js connection to Gonka...");

        const response = await fetch(
            "https://api.gonkarouter.io/v1/messages",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": process.env.GONKA_API_KEY
                },
                body: JSON.stringify({
                    model: "deepseek-ai/DeepSeek-V4-Flash-0731",
                    max_tokens: 10,
                    messages: [
                        {
                            role: "user",
                            content: "TEST"
                        }
                    ]
                })
            }
        );

        console.log("HTTP status:", response.status);

        const data = await response.json();

        console.log("Response:", JSON.stringify(data, null, 2));

    } catch (error) {
        console.error("Connection failed:", error);
    }
}

testConnection();