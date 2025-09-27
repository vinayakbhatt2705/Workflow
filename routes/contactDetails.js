const express = require("express");
const router = express.Router();
const ContactDetails = require("../models/ContactDetails");

// Create Contact
router.post("/", async (req, res) => {
  try {
    const contact = new ContactDetails(req.body);
    await contact.save();
    res.status(201).json(contact);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all contacts
router.get("/", async (req, res) => {
  try {
    const contacts = await ContactDetails.find().populate("emp_code").populate("asset_codes");
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
