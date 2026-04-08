const express = require("express");
const router = express.Router();

const Staff = require("../models/staff");
const SystemSettings = require("../models/systemSettings");

/* GET ALL STAFF */
router.get("/", async (req, res) => {
    try {
        const staff = await Staff.find();
        res.json(staff);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ADD STAFF */
router.post("/", async (req, res) => {
    try {
        const payload = { ...req.body };
        
        // If a Doctor is added without explicit visiting hours, try to inherit them from SystemSettings
        if (payload.role === 'Doctor' && !payload.visitingHours) {
            const sys = await SystemSettings.findOne();
            if (sys && sys.startTime && sys.endTime) {
                payload.visitingHours = {
                    startTime: sys.startTime,
                    endTime: sys.endTime
                };
            }
        }

        const staff = new Staff(payload);
        await staff.save();
        res.json({ message: "Staff added", staff });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* UPDATE STAFF */

router.put("/:id", async (req, res) => {
    try {
        const query = { $or: [{ _id: req.params.id }, { staffId: req.params.id }] };

        await Staff.findOneAndUpdate(
            query, 
            req.body, 
            { new: true, upsert: true }
        );
        res.json({ message: "Staff Updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* DELETE STAFF */

router.delete("/:id", async (req, res) => {
    try {
        const query = { $or: [{ _id: req.params.id }, { staffId: req.params.id }] };

        await Staff.findOneAndDelete(query);
        res.json({ message: "Staff Deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
