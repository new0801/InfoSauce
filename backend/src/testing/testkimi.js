require("dotenv").config();

const { askGonka } = require("./services/gonka");

async function testKimi() {
    try {
        const result = await askGonka(
            "The Earth is flat.",
            "moonshotai/Kimi-K2.6"
        );

        console.log("===== KIMI FULL RESPONSE =====");
        console.dir(result, { depth: null });
        console.log("===== END RESPONSE =====");

    } catch (error) {
        console.error("Kimi test failed:");
        console.error(error);
        }
    }

testKimi();