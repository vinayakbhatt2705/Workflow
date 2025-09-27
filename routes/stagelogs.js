const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken"); // for auth
const Incident = require("../models/Incident");
const WorkflowStage = require("../models/WorkflowStage");
const StageLog = require("../models/StageLog");


router.put("/:id", async (req, res) => {
  try {
    const updated = await StageLog.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
module.exports =  { stagelogs: router };