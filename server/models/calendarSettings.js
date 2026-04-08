const mongoose = require("../database");

const CalendarSettingsSchema = new mongoose.Schema({
    calendarStartTime: { type: String, default: "08:00" },
    calendarEndTime: { type: String, default: "20:00" },
    slotInterval: { type: Number, default: 30 }
}, { timestamps: true });

module.exports = mongoose.model("CalendarSettings", CalendarSettingsSchema);
