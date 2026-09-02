require("dotenv").config();
const { askGonka } = require("./services/gonka");

async function testGonka() {
    try {
        const result = await askGonka(
            "Reply with exactly: InfoSauce Gonka connection works."
        );

        console.log("Gonka response:");
        console.log(result);

    } catch (error) {
        console.error("Test failed:");
        console.error(error.message);
    }
}

testGonka();