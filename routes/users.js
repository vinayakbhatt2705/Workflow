const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Get all users
/*router.get('/', async (req, res) => {
    const users = await User.find().populate('profile_id role');
    res.json(users);
});*/

// Get single user
router.get('/:id', async (req, res) => {
    const user = await User.findById(req.params.id).populate('profile_id role');
    res.json(user);
});

// Create user
router.post('/', async (req, res) => {
    const user = new User(req.body);
    await user.save();
    res.json(user);
});

// Update user
router.put('/:id', async (req, res) => {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(user);
});

// Delete user
router.delete('/:id', async (req, res) => {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
});

// GET /api/users
router.get("/", async (req, res) => {
  try {
    const users = await User.find({ active: "y" }).select("username _id");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
