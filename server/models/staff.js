const mongoose = require("../database");

const StaffSchema = new mongoose.Schema({
    staffId: {
        type: String,
        unique: true, // ensures no duplicate staff IDs
        index: true
    },
    name: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    email: {
        type: String
    },
    spec: {
        type: String
    },
    appointmentFees: {
        type: Number,
        default: 0
    },
    visitingHours: {
        startTime: { type: String, default: "09:00" },
        endTime: { type: String, default: "20:00" }
    }
}, { timestamps: true });

// Pre-save hook to generate staffId if not provided
StaffSchema.pre('save', async function () {
    if (this.isNew && (!this.staffId || this.staffId === '')) {
        try {
            const lastStaff = await this.constructor
                .findOne()
                .sort({ staffId: -1 }) // get the highest staffId
                .exec();

            let nextNumber = 1;
            if (lastStaff && lastStaff.staffId) {
                const lastNumber = parseInt(lastStaff.staffId.replace('D', ''));
                nextNumber = lastNumber + 1;
            }

            this.staffId = `D${String(nextNumber).padStart(3, '0')}`; // e.g., D001
        } catch (err) {
            console.error('Error generating staff ID:', err);
            this.staffId = `D${Date.now()}`; // fallback
        }
    }
});

module.exports = mongoose.model("Staff", StaffSchema);