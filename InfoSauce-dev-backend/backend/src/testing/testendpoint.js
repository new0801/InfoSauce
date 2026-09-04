async function testEndpoint() {
    try {
        const response = await fetch("http://localhost:3000/api/verify", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                text: ""
            })
        });

        const responseText = await response.text();

        console.log("Status:", response.status);
        console.log("Backend response:");
        console.log(responseText);

    } catch (error) {
        console.error("Request failed:");
        console.error(error);
    }
}

testEndpoint();