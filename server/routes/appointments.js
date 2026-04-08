const express = require("express");
const router = express.Router();
const Appointment = require("../models/appointment");
const Patient = require("../models/patient");
const Invoice = require("../models/invoice");

/* HELPER: Fetch patient Name if not provided */
async function attachPatientName(appointmentData) {
    if (appointmentData.patientId && !appointmentData.patientName) {
        const patient = await Patient.findOne({ patientId: appointmentData.patientId }).lean();
        if (patient) {
            appointmentData.patientName = `${patient.firstName} ${patient.lastName}`.trim();
        }
    }
}

/* HELPER: Check for overlapping appointments */
async function checkOverlap(date, dentist, time, duration, excludeId = null) {
    const existing = await Appointment.find({ date, dentist, status: { $ne: 'cancelled' } }).lean();
    
    let parts = time.replace(/am|pm/ig, '').trim().split(':');
    let start1 = parseInt(parts[0]) * 60 + parseInt(parts[1] || 0);
    if (time.toLowerCase().includes('pm') && parseInt(parts[0]) !== 12) start1 += 12 * 60;
    if (time.toLowerCase().includes('am') && parseInt(parts[0]) === 12) start1 -= 12 * 60;
    
    let end1 = start1 + (parseInt(duration) || 30);

    for (let appt of existing) {
        if (excludeId && (appt._id.toString() === excludeId.toString() || appt.appointmentId === excludeId)) continue;
        if (!appt.time) continue;

        let parts2 = appt.time.replace(/am|pm/ig, '').trim().split(':');
        let start2 = parseInt(parts2[0]) * 60 + parseInt(parts2[1] || 0);
        if (appt.time.toLowerCase().includes('pm') && parseInt(parts2[0]) !== 12) start2 += 12 * 60;
        if (appt.time.toLowerCase().includes('am') && parseInt(parts2[0]) === 12) start2 -= 12 * 60;
        
        let end2 = start2 + (parseInt(appt.scheduledDuration) || 30);

        if (start1 < end2 && start2 < end1) {
            return true; // overlap found
        }
    }
    return false;
}

/* GET ALL APPOINTMENTS */
router.get("/", async (req, res) => {
    try {
        const appointments = await Appointment.find().sort({ date: -1, time: 1 }).lean();
        res.json(appointments);
    } catch (err) {
        console.error("Failed to fetch appointments:", err);
        res.status(500).json({ error: err.message });
    }
});

/* GET APPOINTMENTS BY PATIENT ID (e.g. "P001") */
router.get("/patient/:patientId", async (req, res) => {
    try {
        const appointments = await Appointment.find({ patientId: req.params.patientId }).sort({ date: -1, time: 1 }).lean();
        res.json(appointments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* GET SINGLE APPOINTMENT */
router.get("/:id", async (req, res) => {
    try {
        const id = req.params.id;
        let appointment;

        if (id.startsWith('A')) {
            appointment = await Appointment.findOne({ appointmentId: id }).lean();
        } else {
            appointment = await Appointment.findById(id).lean();
        }

        if (!appointment) return res.status(404).json({ error: "Appointment not found" });
        res.json(appointment);
    } catch (err) {
        console.error("Failed to fetch appointment:", err);
        res.status(500).json({ error: err.message });
    }
});

/* ADD APPOINTMENT */
router.post("/", async (req, res) => {
    try {
        console.log("Received appointment data:", req.body);
        
        let appointmentData = { ...req.body };
        await attachPatientName(appointmentData);

        // Check overlap before saving
        const isOverlap = await checkOverlap(appointmentData.date, appointmentData.dentist, appointmentData.time, appointmentData.scheduledDuration);
        if (isOverlap) {
            return res.status(400).json({ error: "The selected time slot overlaps with another appointment for this doctor." });
        }

        const appointment = new Appointment(appointmentData);
        await appointment.save();

        res.json({ 
            message: "Appointment saved", 
            appointmentId: appointment.appointmentId,
            appointment: appointment
        });
    } catch (err) {
        console.error("Error saving appointment:", err);
        res.status(500).json({ error: err.message });
    }
});

/* UPDATE APPOINTMENT */
router.put("/:id", async (req, res) => {
    try {
        const id = req.params.id;
        let updateData = { ...req.body };

        // Handle patient name attach if patient changed
        if (updateData.patientId) {
            await attachPatientName(updateData);
        }

        let appointment;
        if (id.startsWith('A')) {
            appointment = await Appointment.findOne({ appointmentId: id });
        } else {
            appointment = await Appointment.findById(id);
        }

        if (!appointment) return res.status(404).json({ error: "Appointment not found" });

        // Check overlap if time, date, or duration has been updated
        const checkDate = updateData.date || appointment.date;
        const checkTime = updateData.time || appointment.time;
        const checkDuration = updateData.scheduledDuration || appointment.scheduledDuration;
        const checkDentist = updateData.dentist || appointment.dentist;

        const isOverlap = await checkOverlap(checkDate, checkDentist, checkTime, checkDuration, appointment._id);
        if (isOverlap) {
            return res.status(400).json({ error: "The updated time slot overlaps with another appointment for this doctor." });
        }

        // Logic for Timer
        if (updateData.status === "confirmed" && appointment.status !== "confirmed") {
            updateData.startTime = new Date();
        } else if (updateData.status === "done" && appointment.status !== "done") {
            updateData.endTime = new Date();
            if (appointment.startTime) {
                const start = new Date(appointment.startTime);
                const end = new Date(updateData.endTime);
                updateData.duration = Math.round((end - start) / 1000); // Duration in seconds
            }
        }

        let updatedAppointment;
        if (id.startsWith('A')) {
            updatedAppointment = await Appointment.findOneAndUpdate(
                { appointmentId: id }, updateData, { new: true }
            ).lean();
        } else {
            updatedAppointment = await Appointment.findByIdAndUpdate(id, updateData, { new: true }).lean();
        }

        res.json({ message: "Appointment Updated", appointment: updatedAppointment });
    } catch (err) {
        console.error("Failed to update appointment:", err);
        res.status(500).json({ error: err.message });
    }
});

/* DELETE APPOINTMENT */
router.delete("/:id", async (req, res) => {
    try {
        const id = req.params.id;
        let deletedAppointment;

        if (id.startsWith('A')) {
            deletedAppointment = await Appointment.findOneAndDelete({ appointmentId: id });
        } else {
            deletedAppointment = await Appointment.findByIdAndDelete(id);
        }

        if (!deletedAppointment) return res.status(404).json({ error: "Appointment not found" });

        res.json({ message: "Appointment Deleted" });
    } catch (err) {
        console.error("Failed to delete appointment:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
