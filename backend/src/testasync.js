function waitTwoSeconds() {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve("Finished waiting!");
        }, 2000);
    });
}

async function test() {
    console.log("Starting...");

    const result = await waitTwoSeconds();

    console.log(result);

    console.log("Done!");
}

async function test2() {

    try {
        const result = await waitTwoSeconds();

        console.log(result);

    } catch (error) {
        console.log("Something went wrong:", error);
    }

}

function getData() {
    return new Promise((resolve, reject) => {

        const success = false;

        if (success) {
            resolve("Data received");
        } else {
            reject("Something went wrong");
        }

    });
}

test2();