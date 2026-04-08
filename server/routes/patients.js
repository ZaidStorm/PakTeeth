const express = require("express");
const router = express.Router();
const Patient = require("../models/patient.js");    // your existing patient.js
const Prescription = require("../models/prescription.js");    // your existing prescription.js
const Invoice = require("../models/invoice.js");    // your existing invoice.js

// ========================
// GET ALL PATIENTS
// ========================
router.get("/", async (req, res) => {
    try {
        const patients = await Patient.find();
        res.json(patients);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========================
// GET SINGLE PATIENT BY ID OR patientId
// ========================
router.get("/:id", async (req, res) => {
    try {
        const rawId = req.params.id.trim();
        const query = rawId.match(/^p\d+/i)
            ? { patientId: new RegExp(`^${rawId.trim()}$`, "i") }
            : { _id: rawId };

        const patient = await Patient.findOne(query);
        if (!patient) return res.status(404).json({ error: "Patient not found" });
        res.json(patient);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========================
// ADD PATIENT
// ========================
router.post("/", async (req, res) => {
    try {
        console.log("Saving patient:", req.body); // See what frontend sends
        const patient = new Patient(req.body);
        await patient.save();
        res.status(201).json({ message: "Patient Saved", patient });
    } catch (error) {
        console.error("Failed to save patient:", error); // Full stack trace
        if (error.code === 11000) {
            return res.status(400).json({ message: "Duplicate patient field: " + Object.keys(error.keyPattern).join(", ") });
        }
        res.status(500).json({ message: error.message });
    }
});

// ========================
// UPDATE PATIENT
// ========================
router.put("/:id", async (req, res) => {
    try {
        const rawId = req.params.id.trim();
        console.log("PUT /patients/%s - Body:", rawId, req.body);
        const query = rawId.match(/^p\d+/i)
            ? { patientId: new RegExp(`^${rawId}$`, "i") }
            : { _id: rawId };

        const updated = await Patient.findOneAndUpdate(query, req.body, { new: true, upsert: true });
        res.json({ message: "Patient Updated", patient: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========================
// DELETE PATIENT
// ========================
router.delete("/:id", async (req, res) => {
    try {
        const rawId = req.params.id.trim();
        const query = rawId.match(/^p\d+/i)
            ? { patientId: new RegExp(`^${rawId}$`, "i") }
            : { _id: rawId };

        const deleted = await Patient.findOneAndDelete(query);
        if (!deleted) return res.status(404).json({ error: "Patient not found" });
        res.json({ message: "Patient Deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========================
// GET FULL PATIENT RECORD
// Uses existing Prescription and Invoice models
// ========================
router.get("/full-record/:query", async (req, res) => {
    try {
        const q = req.params.query.trim();
        let patient = null;

        // 1️⃣ Try patientId (case-insensitive)
        if (/^p\d+/i.test(q)) {
            patient = await Patient.findOne({ patientId: new RegExp(`^${q}$`, "i") });
        }

        // 2️⃣ Try Mongo ObjectId
        if (!patient && /^[0-9a-fA-F]{24}$/.test(q)) {
            patient = await Patient.findById(q);
        }

        // 3️⃣ Try phone number
        if (!patient) {
            patient = await Patient.findOne({ phone: q });
        }

        // 4️⃣ Try name search (firstName, lastName, or fullName)
        if (!patient) {
            const nameRegex = new RegExp(q, "i");
            patient = await Patient.findOne({
                $or: [
                    { firstName: nameRegex },
                    { lastName: nameRegex },
                    { $expr: { $regexMatch: { input: { $concat: ["$firstName", " ", "$lastName"] }, regex: nameRegex } } }
                ]
            });
        }

        if (!patient) return res.status(404).json({ error: "Patient not found" });

        // Fetch related data
        const prescriptions = await Prescription.find({ patientId: patient.patientId });
        const invoice = await Invoice.find({ patientId: patient.patientId });

        // Compute billing summary from invoice
        let billing = { total: 0, paid: 0, credit: 0, balance: 0 };
        invoice.forEach(inv => {
            billing.total += inv.total || 0;
            billing.paid += inv.paid || 0;
            billing.credit += inv.credit || 0;
        });
        billing.balance = billing.total - billing.paid;

        res.json({ patient, prescriptions, billing });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;