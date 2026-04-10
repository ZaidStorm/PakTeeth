const mongoose = require("mongoose");

const CitySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    province: { type: String, default: "" }
}, { timestamps: true });

module.exports = mongoose.model("City", CitySchema);
