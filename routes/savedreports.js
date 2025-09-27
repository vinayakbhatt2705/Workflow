const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken"); // for auth
const SavedReport = require("../models/SavedReport");
const JWT_SECRET = "your_secret_key_here"; // same as auth.js



function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // attach user info (id, username, role)
    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}
// Save report
router.post("/add",authMiddleware, async (req, res) => {
  try { console.log("inside saved reports");
   const report = new SavedReport({
      name: req.body.name,
    //  userId: req.user._id,
      username: req.user.username, // optional
      selectedFields: req.body.selectedFields || [],
      filters: req.body.filters || [],
      groupBy: req.body.groupBy || [],
      orderBy: req.body.orderBy || [],
      chartType: req.body.chartType || 'bar'
    });
    await report.save();
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all saved reports for user
router.get("/reports",authMiddleware, async (req, res) => {
  try {
    const reports = await SavedReport.find({ username: req.user.username });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single report (with filters + group by)
router.get("/reports/:id", authMiddleware, async (req, res) => {
  try {
    const report = await SavedReport.findById(req.params.id);
    if (!report) return res.status(404).json({ error: "Report not found" });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;   // ✅ THIS IS REQUIRED