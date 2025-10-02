const express = require("express");
const router = express.Router();
const ContactDetails = require("../models/ContactDetails");
const multer = require("multer");
const path = require("path");
const jwt = require("jsonwebtoken");

// Multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // make sure this folder exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Middleware to check token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Create Contact with files
router.post("/", authenticateToken, upload.array('files'), async (req, res) => {
  try {
    const files = req.files.map(f => ({
      filename: f.filename,
      originalname: f.originalname,
      path: f.path,
      uploaded_at: new Date()
    }));

     // --- Normalize ref_no to array ---
    const refNoArray = Array.isArray(req.body.ref_no) 
      ? req.body.ref_no 
      : req.body.ref_no ? [req.body.ref_no] : [];

    const contactData = {
      ...req.body,
      files,
      asset_codes: req.body['asset_codes[]'] || [] ,// handle asset_codes array
      ref_no: refNoArray
    };

    const contact = new ContactDetails(contactData);
    await contact.save();
    res.status(201).json(contact);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all contacts
router.get("/", authenticateToken, async (req, res) => {
  try {
    const contacts = await ContactDetails.find()
      .populate("emp_code")
      .populate("asset_codes");
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
