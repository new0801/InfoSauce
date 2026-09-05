//Starts your backend.
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

const PORT = 3000;

app.use(express.json({ limit: "8mb" }));
app.use(cors());

const verifyRouter = require("./routes/verify");
//connects a specific web path prefix to a router module you imported earlier
app.use("/api", verifyRouter);

//When someone sends a GET request to /, run this function.
// "/" represents the root URL.
//req = Request --> Information about what the client sent to your backend.
//res = Response --> This is what your backend sends back to the client.
app.get("/", (req, res) => { 
    //res.json() sends a JSON response.
    res.json({
        message: "Welcome to InfoSauce Backend"
    });
});

app.listen(PORT, () => { //Start listening for incoming HTTP requests on this port
    console.log(`Server running on http://localhost:${PORT}`);
});

