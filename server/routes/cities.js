const express = require("express");
const router = express.Router();
const City = require("../models/City");

// GET all cities
router.get("/", async (req, res) => {
    try {
        const cities = await City.find().sort({ name: 1 });
        res.json(cities);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST add new city
router.post("/", async (req, res) => {
    const city = new City({
        name: req.body.name,
        province: req.body.province || ""
    });
    try {
        const newCity = await city.save();
        res.status(201).json(newCity);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PUT update city name
router.put("/:id", async (req, res) => {
    try {
        const city = await City.findById(req.params.id);
        if (!city) return res.status(404).json({ message: "City not found" });

        if (req.body.name) city.name = req.body.name;
        if (req.body.province !== undefined) city.province = req.body.province;

        const updatedCity = await city.save();
        res.json(updatedCity);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE city
router.delete("/:id", async (req, res) => {
    try {
        const city = await City.findById(req.params.id);
        if (!city) return res.status(404).json({ message: "City not found" });
        await city.remove();
        res.json({ message: "City deleted" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
