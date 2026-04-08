const mongoose = require("../database");

const patientSchema = new mongoose.Schema({
    patientId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    dob: Date,
    age: Number,      // <-- must exist
    gender: String,
    phone: { type: String, sparse: true },
    email: { type: String, sparse: true },
    city: String,     // <-- must exist
    address: String,
    assignedDoctor: String,
    registrationDate: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }

}, { timestamps: true });

// Pre-save hook to generate custom patient ID
patientSchema.pre('save', async function () {
    if (this.isNew && !this.patientId) {
        try {
            // Find the highest existing patient ID
            const lastPatient = await this.constructor.findOne().sort({ patientId: -1 }).exec();
            let nextNumber = 1;

            if (lastPatient && lastPatient.patientId) {
                const lastNumber = parseInt(lastPatient.patientId.replace('P', ''));
                nextNumber = lastNumber + 1;
            }

            this.patientId = `P${nextNumber}`;
        } catch (error) {
            console.error('Error generating patient ID:', error);
            this.patientId = `P${Date.now()}`;
        }
    }
});

module.exports = mongoose.model("Patient", patientSchema);