const express = require("express");
const router = express.Router();
const Encounter = require("../models/encounter");

/* GET ALL ENCOUNTERS */
router.get("/", async (req, res) => {
    try {
        const encounters = await Encounter.find()
            .populate("patientId", "firstName lastName")
            .populate("staffId", "name role")
            .populate("appointmentId", "date time");
        res.json(encounters);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* GET ENCOUNTERS BY PATIENT */
router.get("/patient/:patientId", async (req, res) => {
    try {
        const encounters = await Encounter.find({ patientId: req.params.patientId })
            .populate("staffId", "name role");
        res.json(encounters);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* GET SINGLE ENCOUNTER */
router.get("/:id", async (req, res) => {
    try {
        const encounter = await Encounter.findById(req.params.id)
            .populate("patientId", "firstName lastName")
            .populate("staffId", "name role")
            .populate("appointmentId", "date time");
        if (!encounter) return res.status(404).json({ error: "Encounter not found" });
        res.json(encounter);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ADD ENCOUNTER */
router.post("/", async (req, res) => {
    try {
        const encounter = new Encounter(req.body);
        await encounter.save();
        res.json({ message: "Encounter Saved", encounter });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* UPDATE ENCOUNTER */
router.put("/:id", async (req, res) => {
    try {
        await Encounter.findByIdAndUpdate(req.params.id, req.body);
        res.json({ message: "Encounter Updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* DELETE ENCOUNTER */
router.delete("/:id", async (req, res) => {
    try {
        await Encounter.findByIdAndDelete(req.params.id);
        res.json({ message: "Encounter Deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
