const express = require("express");
const router = express.Router();
const Inventory = require("../models/inventory");

/* GET LOW STOCK ITEMS — must be BEFORE /:id */
router.get("/status/low-stock", async (req, res) => {
    try {
        const items = await Inventory.find({ $expr: { $lte: ["$quantity", "$minStockLevel"] } });
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* GET ALL INVENTORY ITEMS */
router.get("/", async (req, res) => {
    try {
        const items = await Inventory.find();
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* GET SINGLE INVENTORY ITEM */
router.get("/:id", async (req, res) => {
    try {
        const item = await Inventory.findById(req.params.id);
        if (!item) return res.status(404).json({ error: "Item not found" });
        res.json(item);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ADD INVENTORY ITEM */
router.post("/", async (req, res) => {
    try {
        const item = new Inventory(req.body);
        await item.save();
        res.json({ message: "Inventory Item Saved", item });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* UPDATE INVENTORY ITEM */
router.put("/:id", async (req, res) => {
    try {
        await Inventory.findByIdAndUpdate(req.params.id, req.body);
        res.json({ message: "Inventory Item Updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* DELETE INVENTORY ITEM */
router.delete("/:id", async (req, res) => {
    try {
        await Inventory.findByIdAndDelete(req.params.id);
        res.json({ message: "Inventory Item Deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
