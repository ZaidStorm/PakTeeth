const mongoose = require("../database");

const reportSchema = new mongoose.Schema({
    patientId: { type: String, required: true },
    category: { type: String, default: "Uncategorized" },
    filename: { type: String, required: true },
    filePath: { type: String },
    fileType: { type: String, required: true },
    description: { type: String, default: "" },
    comments: { type: String, default: "" },
    uploadDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Report", reportSchema);
