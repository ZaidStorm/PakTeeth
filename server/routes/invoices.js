const express = require("express");
const router = express.Router();
const Invoice = require("../models/invoice");

const Patient = require("../models/patient"); // add at the top if not already imported

/* GET ALL INVOICES */
router.get("/", async (req, res) => {
    try {
        const invoices = await Invoice.find();

        // Fetch all patients to map by patientId
        const patients = await Patient.find();
        const patientsMap = {};
        patients.forEach(p => {
            patientsMap[p.patientId] = {
                firstName: p.firstName,
                lastName: p.lastName
            };
        });

        // Attach patient info manually
        const invoicesWithPatient = invoices.map(inv => {
            return {
                ...inv._doc,               // keep invoice fields
                patient: patientsMap[inv.patientId] || null
            };
        });

        res.json(invoicesWithPatient);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* GET INVOICES BY PATIENT */
router.get("/patient/:patientId", async (req, res) => {
    try {
        const invoices = await Invoice.find({ patientId: req.params.patientId });
        res.json(invoices);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* GET SINGLE INVOICE */
router.get("/:id", async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id)
            .populate("patientId", "firstName lastName");
        if (!invoice) return res.status(404).json({ error: "Invoice not found" });
        res.json(invoice);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ADD INVOICE */
router.post("/", async (req, res) => {
    try {
        const invoice = new Invoice(req.body);
        await invoice.save();
        res.json({ message: "Invoice Saved", invoice });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* UPDATE INVOICE (Record Payment / Update) */
router.put("/:id", async (req, res) => {
    try {
        const { paid, balance, credit, status } = req.body;
        
        // Find existing invoice to check logic if needed
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ error: "Invoice not found" });

        // Update fields
        await Invoice.findByIdAndUpdate(req.params.id, req.body);
        
        res.json({ message: "Invoice Updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* DELETE INVOICE */
router.delete("/:id", async (req, res) => {
    try {
        await Invoice.findByIdAndDelete(req.params.id);
        res.json({ message: "Invoice Deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
