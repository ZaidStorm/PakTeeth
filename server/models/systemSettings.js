const mongoose = require("../database");

const SystemSettingsSchema = new mongoose.Schema({
    startTime: { type: String, default: "09:00" },
    endTime: { type: String, default: "20:00" },
    slotInterval: { type: Number, default: 30 }
}, { timestamps: true });

module.exports = mongoose.model("SystemSettings", SystemSettingsSchema);
