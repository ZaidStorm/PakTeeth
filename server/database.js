const mongoose = require("mongoose");

const MONGO_URI = "mongodb://127.0.0.1:27017/pakteeth";
const MAX_RETRIES = 8;
const RETRY_MS   = 2000;

async function connectWithRetry(attempt) {
    attempt = attempt || 1;
    try {
        await mongoose.connect(MONGO_URI);
        console.log("MongoDB Connected");
    } catch (err) {
        if (attempt < MAX_RETRIES) {
            console.log("MongoDB not ready, retrying (" + attempt + "/" + MAX_RETRIES + ")...");
            setTimeout(function() { connectWithRetry(attempt + 1); }, RETRY_MS);
        } else {
            console.error("MongoDB connection failed after " + MAX_RETRIES + " attempts:", err);
            process.exit(1);
        }
    }
}

connectWithRetry();

module.exports = mongoose;