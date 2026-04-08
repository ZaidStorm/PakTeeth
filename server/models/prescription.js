const mongoose = require("../database");

const PrescriptionSchema = new mongoose.Schema({
    Rx_id: {
        type: String,
        unique: true,
        index: true
    },
    patientId: {
        type: String,
        required: true
    },
    staffId: {
        type: String
    },
    medications: [{
        name: String,
        dosage: String,
        frequency: String,
        duration: String,
        instructions: String
    }],
    diagnosis: {
        type: String
    },
    allergies: {
        type: String
    },
    status: {
        type: String,
        default: 'draft'
    },
    notes: {
        type: String
    },
    date: {
        type: String,
        default: () => new Date().toISOString().split('T')[0]
    }
}, { timestamps: true });

// Pre-save hook to generate custom prescription ID
PrescriptionSchema.pre('save', async function() {
    if (this.isNew && !this.Rx_id) {
        try {
            // Find the highest existing prescription ID
            const lastRx = await this.constructor.findOne().sort({ Rx_id: -1 }).exec();
            let nextNumber = 1;
            
            if (lastRx && lastRx.Rx_id) {
                const match = lastRx.Rx_id.match(/Rx(\d+)/);
                if (match) {
                    const lastNumber = parseInt(match[1]) || 0;
                    nextNumber = lastNumber + 1;
                }
            }
            
            this.Rx_id = `Rx${nextNumber.toString().padStart(3, '0')}`;
        } catch (error) {
            console.error('Error generating prescription ID:', error);
            this.Rx_id = `Rx${Date.now()}`;
        }
    }
});

module.exports = mongoose.model("Prescription", PrescriptionSchema);
