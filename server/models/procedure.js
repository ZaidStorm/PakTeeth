const mongoose = require("mongoose");

const ProcedureSchema = new mongoose.Schema({
    patientId: {
        type: String,
        ref: "Patient",
        required: true
    },
    chartType: {
        type: String,
        enum: ['adult', 'child'],
        default: 'adult'
    },
    procedureDate: {
        type: String,
        required: true
    },
    toothNumber: {
        type: String,
        default: ""
    },
    surface: {
        type: String,
        default: ""
    },
    isFullMouth: {
        type: Boolean,
        default: false
    },
    diagnosis: {
        type: String,
        default: ""
    },
    treatmentCode: {
        type: String,
        default: ""
    },
    treatmentName: {
        type: String,
        required: true
    },
    steps: {
        type: String,
        default: "NA"
    },
    fee: {
        type: Number,
        default: 0
    },
    discount: {
        type: Number,
        default: 0
    },
    payable: {
        type: Number,
        default: 0
    },
    clinicalNotes: {
        type: String,
        default: ""
    },
    doctor: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ["Pending", "Completed", "Cancelled"],
        default: "Completed"
    }
}, { timestamps: true });

module.exports = mongoose.model("Procedure", ProcedureSchema);
