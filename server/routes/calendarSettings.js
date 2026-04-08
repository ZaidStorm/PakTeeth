const express = require("express");
const router = express.Router();
const CalendarSettings = require("../models/calendarSettings");

/* GET – return settings (auto-create defaults if none exist) */
router.get("/", async (req, res) => {
    try {
        let s = await CalendarSettings.findOne();
        if (!s) {
            s = await CalendarSettings.create({});   // uses schema defaults
        }
        // Ensure defaults are sent even if the document exists but is missing fields
        const doc = s.toObject();
        if (doc.slotInterval === undefined) doc.slotInterval = 30;
        if (!doc.calendarStartTime) doc.calendarStartTime = "08:00";
        if (!doc.calendarEndTime) doc.calendarEndTime = "20:00";

        res.json(doc);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* PUT – update settings */
router.put("/", async (req, res) => {
    try {
        const { calendarStartTime, calendarEndTime, slotInterval } = req.body;
        
        const update = {};
        if (calendarStartTime !== undefined) update.calendarStartTime = calendarStartTime;
        if (calendarEndTime !== undefined) update.calendarEndTime = calendarEndTime;
        if (slotInterval !== undefined) update.slotInterval = parseInt(slotInterval, 10);
        
        const settings = await CalendarSettings.findOneAndUpdate(
            {}, 
            { $set: update }, 
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        
        res.json({ message: "Calendar settings saved", settings });
    } catch (err) {
        console.error("Error saving calendar settings:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
