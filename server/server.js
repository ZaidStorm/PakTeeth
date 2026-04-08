const express = require("express");
const cors = require("cors");
const path = require("path");

require("./database");

const app = express();

app.use(cors());
app.use(express.json());

// Serve static files from the project root
app.use(express.static(path.join(__dirname, "..")));

/* ========== ROUTES ========== */
app.use("/patients", require("./routes/patients"));
app.use("/staff", require("./routes/staff"));
app.use("/appointments", require("./routes/appointments"));
app.use("/prescriptions", require("./routes/prescriptions"));
app.use("/invoices", require("./routes/invoices"));
app.use("/inventory", require("./routes/inventory"));
app.use("/users", require("./routes/users"));
app.use("/dental-charts", require("./routes/dentalCharts"));
app.use("/encounters", require("./routes/encounters"));
app.use("/procedures", require("./routes/procedures"));
app.use("/treatments", require("./routes/treatments"));
app.use("/followups", require("./routes/followups"));
app.use("/reports", require("./routes/reports"));
app.use("/settings", require("./routes/settings"));
app.use("/system-settings", require("./routes/systemSettings"));
app.use("/calendar-settings", require("./routes/calendarSettings"));

/* ========== SEED ADMIN USER ========== 
const User = require("./models/user");
async function seedAdmin() {
    try {
        const count = await User.countDocuments();
        if (count === 0) {
            const admin = new User({
                name: "Admin",
                email: "admin@pakteeth.com",
                password: "admin",
                role: "admin"
            });
            await admin.save();
            console.log("Seeded default admin user (admin@pakteeth.com / admin)");
        }
    } catch (err) {
        console.error("Error seeding admin:", err);
    }
}
seedAdmin();
*/
/* ========== START SERVER ========== */
app.listen(3000, async () => {
    console.log("Server running on port 3000");
    console.log("MongoDB Connected - All routes initialized");

    // ── Startup migration ──
    try {
        const mongoose = require("./database");
        // Wait a moment for the connection to be fully ready
        await new Promise(r => setTimeout(r, 2000));
        const db = mongoose.connection.db;
        if (db) {
            // 1) Drop stale unique indexes on email & phone in patients collection
            try {
                const patientsCol = db.collection("patients");
                const indexes = await patientsCol.indexes();
                for (const idx of indexes) {
                    if (idx.unique && idx.key) {
                        if (idx.key.email || idx.key.phone) {
                            console.log(`[Migration] Dropping stale unique index: ${idx.name}`);
                            await patientsCol.dropIndex(idx.name);
                        }
                    }
                }
                console.log("[Migration] Patient indexes cleaned ✓");
            } catch (e) {
                if (e.code !== 26) console.error("[Migration] Index cleanup error:", e.message);
            }

            // 2) Migrate old Report 'type' field → 'fileType'
            try {
                const reportsCol = db.collection("reports");
                const result = await reportsCol.updateMany(
                    { type: { $exists: true }, fileType: { $exists: false } },
                    [{ $set: { fileType: "$type" } }, { $unset: "type" }]
                );
                if (result.modifiedCount > 0) {
                    console.log(`[Migration] Migrated ${result.modifiedCount} reports: type → fileType ✓`);
                }
            } catch (e) {
                console.error("[Migration] Report migration error:", e.message);
            }
        }
    } catch (e) {
        console.error("[Migration] Startup migration failed:", e.message);
    }
});
