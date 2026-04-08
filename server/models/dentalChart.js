const mongoose = require("mongoose");

const DentalChartSchema = new mongoose.Schema({
    patientId: {
        type: String,
        required: true
    },

    staffId: {
        type: String
    },

    teeth: {
        type: Object,
        required: true
    },

    notes: {
        type: String,
        default: ""
    },

    date: {
        type: Date,
        default: Date.now
    },

    chartType: {
        type: String,
        enum: ['adult', 'child'],
        default: 'adult'
    },

    // NEW FIELDS

    treatmentHistory: {
        type: [
            {
                toothNumber: Number,
                surface: String,       // M, D, B, L, O
                treatment: String,     // caries, filling, rct, extraction
                staffId: String,
                timestamp: {
                    type: Date,
                    default: Date.now
                }
            }
        ],
        default: []
    },

    lastUpdatedBy: {
        type: String,
        default: ""
    },

    version: {
        type: Number,
        default: 1
    }
});

module.exports = mongoose.model("DentalChart", DentalChartSchema);