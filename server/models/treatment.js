const mongoose = require("mongoose");

const TreatmentSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    defaultFee: {
        type: Number,
        default: 0
    },
    category: {
        type: String,
        default: "General"
    },
    isFavorite: {
        type: Boolean,
        default: false
    },
    icon: {
        type: String,
        default: "🦷"
    }
}, { timestamps: true });

module.exports = mongoose.model("Treatment", TreatmentSchema);
