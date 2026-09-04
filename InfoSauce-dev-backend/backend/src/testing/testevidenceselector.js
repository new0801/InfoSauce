require("dotenv").config();

const { selectEvidence } = require("../services/evidenceselector");

async function runTest() {
    const claim =
        "Rocket Lab plans to launch its Neutron rocket in 2025.";

    const evidence = [
        {
            title: "Rocket Lab Announces Neutron Development Progress",
            content:
                "Rocket Lab has continued development of its Neutron rocket and has discussed plans for its first launch.",
            source: "Rocket Lab",
            url: "https://www.rocketlabusa.com/",
            publishedAt: "2025-01-01",
            platform: "exa"
        },

        {
            title: "My Favorite Basketball Players",
            content:
                "LeBron James and Michael Jordan are two of my favorite basketball players.",
            source: "Reddit",
            url: "https://www.reddit.com/",
            publishedAt: "2025-01-02",
            platform: "reddit"
        },

        {
            title: "Rocket Lab Neutron Update",
            content:
                "Rocket Lab has been developing Neutron, a reusable medium-lift rocket designed for future missions.",
            source: "Space News",
            url: "https://example.com/rocket-lab",
            publishedAt: "2025-02-01",
            platform: "exa"
        },

        {
            title: "Best Foods for Muscle Growth",
            content:
                "Chicken, eggs, rice, and vegetables are useful foods for people who want to build muscle.",
            source: "Health Blog",
            url: "https://example.com/fitness",
            publishedAt: "2025-02-01",
            platform: "web"
        }
    ];

    try {
        console.log("=================================");
        console.log("EVIDENCE SELECTION TEST");
        console.log("=================================");

        console.log("\nClaim:");
        console.log(claim);

        console.log("\nNumber of candidate evidence:");
        console.log(evidence.length);

        console.log("\nSending evidence to all models...\n");

        const result = await selectEvidence(
            claim,
            evidence
        );

        console.log("=================================");
        console.log("SELECTION RESULTS");
        console.log("=================================");

        console.dir(result, {
            depth: null
        });

        console.log("\n=================================");
        console.log("INTERPRETED RESULTS");
        console.log("=================================");

        for (const modelResult of result.results) {

            console.log(`\nModel: ${modelResult.model}`);

            console.log(
                "Selected evidence indexes:",
                modelResult.selectedEvidence
            );

            console.log("Selected evidence:");

            for (const index of modelResult.selectedEvidence) {

                const selected =
                    result.candidates[index];

                if (!selected) {
                    continue;
                }

                console.log(
                    `\n[${index}] ${selected.title}`
                );

                console.log(
                    `Source: ${selected.source}`
                );

                console.log(
                    `URL: ${selected.url}`
                );
            }
        }

        if (result.failures.length > 0) {

            console.log("\n=================================");
            console.log("MODEL FAILURES");
            console.log("=================================");

            console.dir(
                result.failures,
                { depth: null }
            );
        }

        console.log("\n=================================");
        console.log("TEST COMPLETE");
        console.log("=================================");

    } catch (error) {

        console.error(
            "\nTEST FAILED:"
        );

        console.error(
            error
        );
    }
}

runTest();