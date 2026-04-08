const express = require("express");
const router = express.Router();
const Procedure = require("../models/procedure");

/* GET ALL */
router.get("/", async (req, res) => {
    try {
        const procedures = await Procedure.find().sort({ procedureDate: -1 });
        res.json(procedures);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* GET BY PATIENT */
router.get("/patient/:patientId", async (req, res) => {
    try {
        const procedures = await Procedure.find({ patientId: req.params.patientId })
            .sort({ procedureDate: -1, createdAt: -1 });
        res.json(procedures);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* GET SINGLE */
router.get("/:id", async (req, res) => {
    try {
        const procedure = await Procedure.findById(req.params.id);
        if (!procedure) return res.status(404).json({ error: "Procedure not found" });
        res.json(procedure);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* CREATE */
router.post("/", async (req, res) => {
    try {
        // Calculate payable if not provided
        const body = req.body;
        if (body.payable === undefined || body.payable === null) {
            body.payable = (parseFloat(body.fee) || 0) - (parseFloat(body.discount) || 0);
        }
        const procedure = new Procedure(body);
        await procedure.save();
        res.status(201).json({ message: "Procedure saved", procedure });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* UPDATE */
router.put("/:id", async (req, res) => {
    try {
        const body = req.body;
        if (body.fee !== undefined || body.discount !== undefined) {
            body.payable = (parseFloat(body.fee) || 0) - (parseFloat(body.discount) || 0);
        }
        const updated = await Procedure.findByIdAndUpdate(req.params.id, body, { new: true });
        if (!updated) return res.status(404).json({ error: "Procedure not found" });
        res.json({ message: "Procedure updated", procedure: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* DELETE */
router.delete("/:id", async (req, res) => {
    try {
        await Procedure.findByIdAndDelete(req.params.id);
        res.json({ message: "Procedure deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
