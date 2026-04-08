const express = require("express");
const router = express.Router();
const Report = require("../models/Report");

/* CREATE */
router.post("/", async (req, res) => {
    try {
        const report = new Report(req.body);
        await report.save();
        res.status(201).json(report);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* READ ALL BY PATIENT */
router.get("/patient/:id", async (req, res) => {
    try {
        const reports = await Report.find({ patientId: req.params.id }).sort({ uploadDate: -1 });
        res.json(reports);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* UPDATE */
router.put("/:id", async (req, res) => {
    try {
        const report = await Report.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(report);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* DELETE */
router.delete("/:id", async (req, res) => {
    try {
        await Report.findByIdAndDelete(req.params.id);
        res.json({ message: "Report deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
