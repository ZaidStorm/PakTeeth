const express = require("express");
const router = express.Router();
const User = require("../models/user");
const bcrypt = require("bcryptjs"); // Used for updating passwords explicitly if needed

/* GET ALL USERS */
router.get("/", async (req, res) => {
    try {
        const users = await User.find().select("-password");
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* GET SINGLE USER */
router.get("/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password");
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ADD USER */
router.post("/", async (req, res) => {
    try {
        const user = new User(req.body);
        await user.save(); // password hashing happens in pre-save hook
        res.json({ message: "User Saved", user: { ...user.toObject(), password: undefined } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* USER LOGIN */
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        // Find user by email first
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        // Use the model method to compare password
        const isMatch = await user.comparePassword(password);
        
        if (isMatch) {
            user.lastLogin = new Date();
            await user.save(); // save updates lastLogin, ignores password because it's not modified
            res.json({ success: true, user: { ...user.toObject(), password: undefined } });
        } else {
            res.status(401).json({ success: false, message: "Invalid credentials" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* UPDATE USER */
router.put("/:id", async (req, res) => {
    try {
        // Find the user first to utilize the pre-save hook if password is changed
        const user = await User.findById(req.params.id);
        if(!user) return res.status(404).json({ error: "User not found" });

        // Update fields manually to trigger pre-save hook for password
        Object.keys(req.body).forEach(key => {
            user[key] = req.body[key];
        });

        await user.save();
        res.json({ message: "User Updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* DELETE USER */
router.delete("/:id", async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: "User Deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
