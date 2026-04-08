const express = require("express");
const router = express.Router();
const SystemSettings = require("../models/systemSettings");

/* GET – return settings (auto-create defaults if none exist) */
router.get("/", async (req, res) => {
    try {
        let s = await SystemSettings.findOne();
        if (!s) {
            s = await SystemSettings.create({});   // uses schema defaults
        }
        res.json(s);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* PUT – update settings */
router.put("/", async (req, res) => {
    try {
        const { startTime, endTime, slotInterval } = req.body;
        let s = await SystemSettings.findOne();
        if (!s) s = new SystemSettings();
        if (startTime !== undefined) s.startTime = startTime;
        if (endTime !== undefined) s.endTime = endTime;
        if (slotInterval !== undefined) s.slotInterval = slotInterval;
        await s.save();
        res.json({ message: "Settings saved", settings: s });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
