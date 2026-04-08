const express = require("express");
const router = express.Router();
const DentalChart = require("../models/dentalChart");

/* ================================
   GET ALL DENTAL CHARTS
================================ */
router.get("/", async (req, res) => {
    try {
        const charts = await DentalChart.find()
            .populate("patientId", "firstName lastName")
            .populate("staffId", "name role");
        res.json(charts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ================================
   GET DENTAL CHARTS BY PATIENT
================================ */
router.get("/patient/:patientId", async (req, res) => {
    try {
        const charts = await DentalChart.find({ patientId: req.params.patientId })
            .populate("staffId", "name role");
        res.json(charts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ================================
   GET SINGLE DENTAL CHART
================================ */
router.get("/:id", async (req, res) => {
    try {
        const chart = await DentalChart.findById(req.params.id)
            .populate("patientId", "firstName lastName")
            .populate("staffId", "name role");
        if (!chart) return res.status(404).json({ error: "Chart not found" });
        res.json(chart);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ================================
   ADD DENTAL CHART ENTRY
   Automatically handles new fields
================================ */
router.post("/", async (req, res) => {
    try {
        const { patientId, staffId, teeth, notes, treatmentHistory } = req.body;

        if (!patientId) {
            return res.status(400).json({ error: "patientId required" });
        }

        const chart = new DentalChart({
            patientId,
            staffId: staffId || "",
            teeth: teeth || {},
            notes: notes || "",
            treatmentHistory: treatmentHistory || [],
            lastUpdatedBy: staffId || "",
            version: 1
        });

        await chart.save();

        res.json({ message: "Dental Chart Entry Saved", chart });

    } catch (err) {
        console.error("Dental Chart Save Error:", err);
        res.status(500).json({ error: err.message });
    }
});

/* ================================
   UPDATE DENTAL CHART ENTRY
   Updates teeth, treatmentHistory, notes, lastUpdatedBy, version
================================ */
router.put("/:id", async (req, res) => {
    try {
        const { teeth, treatmentHistory, notes, staffId } = req.body;

        const chart = await DentalChart.findById(req.params.id);
        if (!chart) return res.status(404).json({ error: "Chart not found" });

        // Update main fields
        if (teeth) chart.teeth = teeth;
        if (notes !== undefined) chart.notes = notes;
        if (treatmentHistory) chart.treatmentHistory = treatmentHistory;

        if (staffId) chart.lastUpdatedBy = staffId;

        // Increment version
        chart.version = chart.version + 1;

        await chart.save();

        res.json({ message: "Dental Chart Entry Updated", chart });

    } catch (err) {
        console.error("Dental Chart Update Error:", err);
        res.status(500).json({ error: err.message });
    }
});

/* ================================
   DELETE DENTAL CHART ENTRY
================================ */
router.delete("/:id", async (req, res) => {
    try {
        const chart = await DentalChart.findByIdAndDelete(req.params.id);
        if (!chart) return res.status(404).json({ error: "Chart not found" });

        res.json({ message: "Dental Chart Entry Deleted" });

    } catch (err) {
        console.error("Dental Chart Delete Error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;