const mongoose = require("../database");

const EncounterSchema = new mongoose.Schema({
    patientId: {
        type: String,
        ref: "Patient",
        required: true
    },
    staffId: {
        type: String,
        ref: "Staff"
    },
    appointmentId: {
        type: String,
        ref: "Appointment"
    },
    chiefComplaint: {
        type: String
    },
    diagnosis: {
        type: String
    },
    treatment: {
        type: String
    },
    notes: {
        type: String
    },
    vitals: {
        bloodPressure: String,
        pulse: String,
        temperature: String,
        weight: String
    },
    date: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model("Encounter", EncounterSchema);
