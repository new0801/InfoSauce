require("dotenv").config();

const { retrieveEvidence } = require("../services/evidence");

async function main() {

    const claim =
        "NASA announced that humans will land on Mars in 2030.";

    console.log("CLAIM:");
    console.log(claim);

    try {

        const result = await retrieveEvidence(claim);

        console.log("\nEVIDENCE RESULT:");
        console.log(
            JSON.stringify(result, null, 2)
        );

    } catch (error) {

        console.error("\nERROR:");
        console.error(error.message);

    }
}

main();