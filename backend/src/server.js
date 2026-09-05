// Starts your backend.
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

// Render provides PORT automatically.
// Locally, use port 3000.
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const verifyRouter = require("./routes/verify");

// Connect API routes
app.use("/api", verifyRouter);

// Root route
app.get("/", (req, res) => {
    res.json({
        message: "Welcome to InfoSauce Backend"
    });
});

// Works locally and on Render
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});