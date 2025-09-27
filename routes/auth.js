// backend/routes/auth.js
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt"); // if passwords are hashed
const User = require("../models/User"); // your users table

const JWT_SECRET = "your_secret_key_here"; // store in env for production

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

 if (!user || user.password !== password) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }
    // If using hashed password
   // const validPassword = await bcrypt.compare(password, user.password);
   // if (!validPassword) return res.status(401).json({ error: "Invalid credentials" });

    // Create JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role,proj_codes: user.proj_codes },
      JWT_SECRET,
      { expiresIn: "8h" }
    );
console.log(token);
    res.json({ token, user: { username: user.username, role: user.role ,proj_codes: user.proj_codes} });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------------- LOGGED-IN USER (getLoggedInUser) ----------------
router.get("/me", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ user: decoded });
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
});

module.exports = router;
