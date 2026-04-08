const express = require("express");
const router = express.Router();
const Prescription = require("../models/prescription");

/* GET ALL PRESCRIPTIONS */
router.get("/", async (req, res) => {
    try {
        const prescriptions = await Prescription.find();
        res.json(prescriptions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* GET PRESCRIPTIONS BY PATIENT */
router.get("/patient/:patientId", async (req, res) => {
    try {
        const prescriptions = await Prescription.find({ patientId: req.params.patientId });
        res.json(prescriptions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* GET SINGLE PRESCRIPTION */
router.get("/:id", async (req, res) => {
    try {
        const prescription = await Prescription.findById(req.params.id);
        if (!prescription) return res.status(404).json({ error: "Prescription not found" });
        res.json(prescription);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ADD PRESCRIPTION */
router.post("/", async (req, res) => {
    try {
        const prescription = new Prescription(req.body);
        await prescription.save();
        res.json({ message: "Prescription Saved", prescription });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* UPDATE PRESCRIPTION */
router.put("/:id", async (req, res) => {
    try {
        await Prescription.findByIdAndUpdate(req.params.id, req.body);
        res.json({ message: "Prescription Updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* DELETE PRESCRIPTION */
router.delete("/:id", async (req, res) => {
    try {
        await Prescription.findByIdAndDelete(req.params.id);
        res.json({ message: "Prescription Deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* MIGRATE: ASSIGN Rx_id TO OLD RECORDS */
router.post("/migrate", async (req, res) => {
    try {
        const prescriptions = await Prescription.find({ Rx_id: { $exists: false } }).sort({ createdAt: 1 });
        let count = 0;
        
        // Get the starting number
        const lastRx = await Prescription.findOne({ Rx_id: { $exists: true } }).sort({ Rx_id: -1 });
        let nextNumber = 1;
        if (lastRx && lastRx.Rx_id) {
            const match = lastRx.Rx_id.match(/Rx(\d+)/);
            if (match) nextNumber = parseInt(match[1]) + 1;
        }

        for (const rx of prescriptions) {
            rx.Rx_id = `Rx${(nextNumber + count).toString().padStart(3, '0')}`;
            await rx.save();
            count++;
        }
        
        res.json({ message: "Migration Complete", updatedCount: count });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
