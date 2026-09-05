require("dotenv").config();

async function testSauceVerify() {

    const response = await fetch(
        "http://localhost:3000/api/verify",
        {
            method: "POST",

            headers: {
                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify({
                type: "url",

                content:
                    "https://www.reddit.com/r/asksg/comments/1w6wyt3/very_bad_haze_currently_but_psi_is_still_pretty/"
            })
        }
    );


    const data =
        await response.json();


    console.log(
        JSON.stringify(
            data,
            null,
            2
        )
    );
}


testSauceVerify();