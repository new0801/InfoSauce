const { extractClaim } = require("../services/claimextractor");

async function runTest(text) {
    console.log("\n================================");
    console.log("INPUT:");
    console.log(text);

    try {
        const result = await extractClaim(text);

        console.log("\nRESULT:");
        console.log(JSON.stringify(result, null, 2));

    } catch (error) {
        console.error("\nERROR:");
        console.error(error.message);
    }
}

async function main() {

    await runTest(
        "OpenAI released GPT-5 today and it is available to everyone for free."
    );

    await runTest(
        "I think AI is going to completely change education."
    );

    await runTest(
        "This new AI model is absolutely amazing!"
    );

    await runTest(
        "NASA announced that humans will land on Mars in 2030."
    );

}

main();