const mongoose = require("../database");

const InventorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        default: 0
    },
    unit: {
        type: String
    },
    unitPrice: {
        type: Number,
        default: 0
    },
    supplier: {
        type: String
    },
    minStockLevel: {
        type: Number,
        default: 10
    },
    expiryDate: {
        type: Date
    },
    location: {
        type: String
    },
    notes: {
        type: String
    }
}, { timestamps: true });

module.exports = mongoose.model("Inventory", InventorySchema);
