// server/models/appointment.js
const mongoose = require("../database");

const AppointmentSchema = new mongoose.Schema({
    appointmentId: {
        type: String,
        unique: true,
        sparse: true   // allow null temporarily so pre-save hook sets it
    },
    // patientId is stored as the CUSTOM String ID (e.g. "P001")
    // NOT a MongoDB ObjectId — this keeps things consistent across both booking flows
    patientId: {
        type: String,
        required: true
    },
    patientName: {
        type: String,
        default: ""
    },
    // dentist is stored as the doctor's NAME (string) — not an ObjectId
    dentist: {
        type: String,
        required: true,
        default: ""
    },
    date: {
        type: String,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    scheduledDuration: {
        type: Number,
        default: 30
    },
    type: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "confirmed", "cancelled", "done"],
        default: "pending"
    },
    // Embedded invoice — used for quick access (amount, paid, services)
    invoice: {
        services: { type: String, default: "" },
        amount: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
        paid: { type: Number, default: 0 },
        balance: { type: Number, default: 0 }
    },
    startTime: { type: Date },
    endTime: { type: Date },
    duration: { type: Number, default: 0 } // duration in seconds
}, { timestamps: true });

// Pre-save hook to generate custom appointment ID  
AppointmentSchema.pre('save', async function () {
    if (this.isNew && !this.appointmentId) {
        try {
            const lastAppointment = await this.constructor
                .findOne({ appointmentId: { $regex: /^A\d+$/ } })
                .sort({ appointmentId: -1 })
                .exec();
            let nextNumber = 1;
            if (lastAppointment && lastAppointment.appointmentId) {
                const lastNumber = parseInt(lastAppointment.appointmentId.replace('A', '')) || 0;
                nextNumber = lastNumber + 1;
            }
            this.appointmentId = `A${nextNumber.toString().padStart(3, '0')}`;
        } catch (error) {
            console.error('Error generating appointment ID:', error);
            this.appointmentId = `A${Date.now()}`;
        }
    }
});

module.exports = mongoose.model("Appointment", AppointmentSchema);