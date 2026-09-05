require("dotenv").config();

const { getNewsByTopic } = require("../services/data");

async function test() {
    try {
        const result = await getNewsByTopic("AI");

        console.log("===== DATA SERVICE RESPONSE =====");
        console.log(JSON.stringify(result, null, 2));
        console.log("=================================");
    } catch (error) {
        console.error("Data integration test failed:");
        console.error(error);
    }
}

const { getNewsByArea } = require("../services/data");

async function test2() {
    try {
        const result = await getNewsByArea("AI & Technology");

        console.log("===== DATA SERVICE AREA RESPONSE =====");
        console.log(JSON.stringify(result, null, 2));
        console.log("=======================================");

    } catch (error) {
        console.error("Data area integration test failed:");
        console.error(error);
    }
}

test2();

