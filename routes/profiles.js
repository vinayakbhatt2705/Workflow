const express = require('express');
const router = express.Router();
const Profile = require('../models/Profile');

// Get all profiles
router.get('/', async (req, res) => {
    const profiles = await Profile.find();
    res.json(profiles);
});

// Get single profile
router.get('/:id', async (req, res) => {
    const profile = await Profile.findById(req.params.id);
    res.json(profile);
});

// Create profile
router.post('/', async (req, res) => {
    try {
        const profile = new Profile(req.body);
        await profile.save();
        res.json(profile);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Update profile
router.put('/:id', async (req, res) => {
    try {
        const profile = await Profile.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(profile);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Delete profile
router.delete('/:id', async (req, res) => {
    try {
        await Profile.findByIdAndDelete(req.params.id);
        res.json({ message: 'Profile deleted successfully' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
