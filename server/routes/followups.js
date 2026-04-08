const express = require("express");
const router = express.Router();
const Appointment = require("../models/appointment");

/**
 * /followups routes — Creates appointments with type "followup"
 * patient-profile.js calls POST /followups, which maps to a new Appointment.
 */

/* GET ALL FOLLOWUP APPOINTMENTS */
router.get("/", async (req, res) => {
    try {
        const followups = await Appointment.find({ type: "followup" }).sort({ date: -1 });
        res.json(followups);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* GET FOLLOWUPS FOR A PATIENT */
router.get("/patient/:patientId", async (req, res) => {
    try {
        const followups = await Appointment.find({ patientId: req.params.patientId, type: "followup" }).sort({ date: -1 });
        res.json(followups);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* CREATE FOLLOWUP (saved as Appointment with type: followup) */
router.post("/", async (req, res) => {
    try {
        const appointmentData = {
            ...req.body,
            type: "followup",   // force type to followup
            status: req.body.status || "pending"
        };
        const appointment = new Appointment(appointmentData);
        await appointment.save();
        res.status(201).json({ message: "Follow-up scheduled", appointment });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* UPDATE FOLLOWUP */
router.put("/:id", async (req, res) => {
    try {
        const updated = await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) return res.status(404).json({ error: "Follow-up not found" });
        res.json({ message: "Follow-up updated", appointment: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* DELETE FOLLOWUP */
router.delete("/:id", async (req, res) => {
    try {
        await Appointment.findByIdAndDelete(req.params.id);
        res.json({ message: "Follow-up deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
