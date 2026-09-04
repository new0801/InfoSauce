require("dotenv").config();

const { askGonkaPrompt } = require("../services/gonka");

async function test() {

    console.log("=================================");
    console.log("GONKA RETRY TEST");
    console.log("=================================");

    try {

        const response = await askGonkaPrompt(
            "Return exactly this JSON and nothing else: {\"test\": \"success\"}",
            "deepseek-ai/DeepSeek-V4-Flash-0731"
        );

        console.log("\n===== GONKA RESPONSE =====");
        console.log(JSON.stringify(response, null, 2));

        console.log("\n===== TEST PASSED =====");

    } catch (error) {

        console.error("\n===== TEST FAILED =====");
        console.error(error);
    }
}

test();
