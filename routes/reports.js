// routes/reports.js
const express = require("express");
const router = express.Router();
const Incident = require("../models/Incident");
const WorkflowStage = require("../models/WorkflowStage");

router.get("/fields", async (req, res) => {
  try {
    // Flatten fields from multiple collections
    const fields = {
      incidents: Object.keys(Incident.schema.paths),
      stages: Object.keys(WorkflowStage.schema.paths),
      // Add more collections as needed
    };
    res.json(fields);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
