const express = require("express");
const router = express.Router();

const Patient = require("../models/patient");
const Prescription = require("../models/prescription");
const Encounter = require("../models/encounter");
const Invoice = require("../models/invoice");
const Staff = require("../models/staff");

/**
 * GET /settings/patient-record?query=...
 * Fetch aggregated patient data by patientId, phone, or name
 */
router.get("/patient-record", async (req, res) => {
    const q = req.query.query ? req.query.query.trim() : "";
    if (!q) return res.status(400).json({ error: "Query parameter is required" });

    try {
        console.log(`Searching patient record for: "${q}"`);

        let patient = null;

        // 1. Try exact Patient ID match (case-insensitive)
        if (q.match(/^P\d+$/i)) {
            patient = await Patient.findOne({ patientId: { $regex: `^${q}$`, $options: "i" } });
        }

        // 2. Try exact Phone match
        if (!patient && /^\d+$/.test(q)) {
            patient = await Patient.findOne({ phone: q });
        }

        // 3. Robust Name Search (handles multi-part names like "Muhammad Zaid Niaz")
        if (!patient) {
            const keywords = q.split(/\s+/).filter(word => word.length > 0);
            
            if (keywords.length > 0) {
                // Each word in the query must match either firstName or lastName
                const queryConditions = keywords.map(word => {
                    const regex = new RegExp(word, "i");
                    return {
                        $or: [
                            { firstName: regex },
                            { lastName: regex }
                        ]
                    };
                });

                patient = await Patient.findOne({ $and: queryConditions });

                // 4. Fallback: Try concatenated full name match (for edge cases)
                if (!patient) {
                    const fullRegex = new RegExp(q, "i");
                    patient = await Patient.findOne({
                        $expr: {
                            $regexMatch: {
                                input: { $concat: ["$firstName", " ", "$lastName"] },
                                regex: fullRegex
                            }
                        }
                    });
                }
            }
        }

        if (!patient) {
            console.warn(`Patient NOT found for query: "${q}"`);
            return res.status(404).json({ error: "Patient not found" });
        }

        const patientId = patient.patientId;

        // 2️⃣ Fetch prescriptions
        const prescriptions = await Prescription.find({ patientId });

        // 3️⃣ Fetch encounters/treatments
        const encounters = await Encounter.find({ patientId })
            .populate("staffId", "staffId name role spec");

        // 4️⃣ Fetch invoices/billing
        const invoices = await Invoice.find({ patientId });

        const totalPaid = invoices.reduce((sum, inv) => sum + (inv.paid || 0), 0);
        const totalBalance = invoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);
        const totalCredits = invoices.reduce((sum, inv) => sum + (inv.credit || 0), 0);

        // 5️⃣ Collect doctors involved
        const staffIdsFromEncounters = encounters.map(e => e.staffId?.staffId).filter(Boolean);
        const staffIdsFromPrescriptions = prescriptions.map(p => p.staffId).filter(Boolean);

        const uniqueStaffIds = [...new Set([...staffIdsFromEncounters, ...staffIdsFromPrescriptions])];

        const doctors = await Staff.find({ staffId: { $in: uniqueStaffIds } });

        // Map doctors to treatments they provided
        const doctorTreatments = doctors.map(doc => {
            const treatments = encounters
                .filter(e => e.staffId?.staffId === doc.staffId && e.treatment)
                .map(e => e.treatment);

            return {
                staffId: doc.staffId,
                name: doc.name,
                role: doc.role,
                spec: doc.spec,
                treatments: [...new Set(treatments)]
            };
        });

        // 6️⃣ Respond with aggregated data
        res.json({
            patient,
            prescriptions,
            encounters,
            billing: {
                invoices,
                totalPaid,
                totalBalance,
                totalCredits
            },
            doctors: doctorTreatments
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
