const mongoose = require("mongoose");
const path = require("path");
const Treatment = require("../models/treatment");

const MONGO_URI = "mongodb://127.0.0.1:27017/pakteeth";

const NEW_TREATMENTS = [
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

async function migrate() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGO_URI);
        console.log("Connected.");

        for (const tData of NEW_TREATMENTS) {
            const result = await Treatment.findOneAndUpdate(
                { code: tData.code },
                { $set: tData },
                { upsert: true, new: true }
            );
            console.log(`Updated/Inserted: [${result.code}] ${result.name} - ${result.defaultFee}`);
        }

        console.log("\nMigration completed successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migrate();
