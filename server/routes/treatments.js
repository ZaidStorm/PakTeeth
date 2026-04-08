const express = require("express");
const router = express.Router();
const Treatment = require("../models/treatment");

const DEFAULT_TREATMENTS = [
    { code: "D137", name: "Filing - Composite", defaultFee: 7000, category: "Restorative", isFavorite: true, icon: "🦷" },
    { code: "D141", name: "White Filling - GIC", defaultFee: 6000, category: "Restorative", isFavorite: true, icon: "⚪" },
    { code: "D150", name: "Extraction - Simple", defaultFee: 5000, category: "Surgical", isFavorite: true, icon: "❌" },
    { code: "D155", name: "Extraction - Surgical", defaultFee: 30000, category: "Surgical", isFavorite: false, icon: "✂️" },
    { code: "D160", name: "Scaling", defaultFee: 8000, category: "Preventive", isFavorite: true, icon: "✨" },
    { code: "D161", name: "Polishing", defaultFee: 3000, category: "Preventive", isFavorite: false, icon: "✨" },
    { code: "D166", name: "Ortho Straight Wire", defaultFee: 380, category: "Orthodontics", isFavorite: false, icon: "🔧" },
    { code: "D174", name: "RCT - Front Teeth", defaultFee: 15000, category: "Endodontic", isFavorite: true, icon: "🔩" },
    { code: "D176", name: "RCT - Back Teeth", defaultFee: 20000, category: "Endodontic", isFavorite: false, icon: "🔩" },
    { code: "D178", name: "Fiber Post Treatment", defaultFee: 3000, category: "Endodontic", isFavorite: false, icon: "🔩" },
    { code: "D190", name: "Crown - PFM", defaultFee: 12000, category: "Prosthetic", isFavorite: false, icon: "👑" },
    { code: "D191", name: "Crown - Zirconia", defaultFee: 30000, category: "Prosthetic", isFavorite: false, icon: "💎" },
    { code: "D100", name: "Acrylic Partial Denture", defaultFee: 4000, category: "Prosthetic", isFavorite: false, icon: "🦷" },
    { code: "D101", name: "Vertex Partial Denture", defaultFee: 6000, category: "Prosthetic", isFavorite: false, icon: "🦷" },
    { code: "D200", name: "Bridge - PFM", defaultFee: 12000, category: "Prosthetic", isFavorite: false, icon: "🌉" },
    { code: "D225", name: "Composite Veneers", defaultFee: 8000, category: "Cosmetic", isFavorite: false, icon: "✨" },
    { code: "D210", name: "Implant", defaultFee: 500, category: "Implantology", isFavorite: false, icon: "🔋" },
    { code: "D220", name: "Whitening", defaultFee: 60, category: "Cosmetic", isFavorite: false, icon: "⭐" },
    { code: "D230", name: "Denture (Full)", defaultFee: 300, category: "Prosthetic", isFavorite: false, icon: "😁" },
    { code: "D240", name: "Sealant", defaultFee: 10, category: "Preventive", isFavorite: false, icon: "🛡️" }
];

/* SEED DEFAULT TREATMENTS */
router.get("/seed", async (req, res) => {
    try {
        const count = await Treatment.countDocuments();
        if (count === 0) {
            await Treatment.insertMany(DEFAULT_TREATMENTS);
            res.json({ message: "Seeded default treatments", count: DEFAULT_TREATMENTS.length });
        } else {
            res.json({ message: "Treatments already exist", count });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* GET ALL */
router.get("/", async (req, res) => {
    try {
        const treatments = await Treatment.find().sort({ isFavorite: -1, code: 1 });
        res.json(treatments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* GET SINGLE */
router.get("/:id", async (req, res) => {
    try {
        const t = await Treatment.findById(req.params.id);
        if (!t) return res.status(404).json({ error: "Treatment not found" });
        res.json(t);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* CREATE */
router.post("/", async (req, res) => {
    try {
        const t = new Treatment(req.body);
        await t.save();
        res.status(201).json(t);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* UPDATE (toggle favorite etc.) */
router.put("/:id", async (req, res) => {
    try {
        const updated = await Treatment.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) return res.status(404).json({ error: "Treatment not found" });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* DELETE */
router.delete("/:id", async (req, res) => {
    try {
        await Treatment.findByIdAndDelete(req.params.id);
        res.json({ message: "Treatment deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
