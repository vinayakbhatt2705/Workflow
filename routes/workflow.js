const express = require("express");
const router = express.Router();
const WorkflowStage = require("../models/WorkflowStage");
const StageLog = require("../models/StageLog");

// PUT update stage
router.put("/edit/:id", async (req, res) => {
  try {
    const { status, stage_state } = req.body;

    const prevStage = await WorkflowStage.findById(req.params.id);
    if (!prevStage) return res.status(404).json({ error: "Stage not found" });

    const stage = await WorkflowStage.findOneAndUpdate(
      { _id: req.params.id },
      { status, stage_state },
      { new: true, runValidators: true }
    );

    let log = await StageLog.findOne({ task_type: stage.task_type, stage_id: stage._id });
    if (!log) {
      log = new StageLog({
        task_type: stage.task_type,
        stage_id: stage._id,
        task: stage.task || `${stage.task_type} - Step ${stage.step_no}`,
        total_time: 0,
      });
    }

    let elapsed = log.total_time || 0;

    if (status === "in-progress" && log.start_time && !log.end_time) {
      elapsed += Math.floor((Date.now() - new Date(log.start_time).getTime()) / 1000);
    }

    if (stage.slaLimitSeconds && elapsed > stage.slaLimitSeconds) {
      stage.slaBreached = true;
      await WorkflowStage.updateOne({ _id: stage._id }, { slaBreached: true });
      await StageLog.updateOne({ stage_id: stage._id }, { slaBreached: true });
    }

    if (status === "in-progress" && prevStage.status !== "in-progress") {
      log.start_time = new Date();
      log.end_time = null;
    }

    if (prevStage.status === "in-progress" && status !== "in-progress" && log.start_time) {
      log.end_time = new Date();
      const diffSeconds = Math.floor((log.end_time - log.start_time) / 1000);
      log.total_time += diffSeconds;
      log.start_time = null;

      if (stage.slaLimitSeconds && log.total_time > stage.slaLimitSeconds) {
        stage.slaBreached = true;
        await WorkflowStage.updateOne({ _id: stage._id }, { slaBreached: true });
        await StageLog.updateOne({ stage_id: stage._id }, { slaBreached: true });
      }
    }

    log.updated_at = new Date();
    await log.save();

    res.json({ stage, log });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update stage" });
  }
});

// GET all stages
router.get("/", async (req, res) => {
  try {
    const stages = await WorkflowStage.find().sort({ task_type: 1,  step_no: 1,task:1  });
    res.json(stages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create stage
router.post("/", async (req, res) => {
  try {

     const data = req.body;
    // If no parent selected, keep null
if (!data.parentTaskType || data.parentTaskType === '') {
  data.parentTaskType = null;
}

  // If parentTaskType is provided, find corresponding parentId
    if (data.parentTaskType) {
      const parentStage = await WorkflowStage.findOne({
        task_type: data.parentTaskType
      });
      data.parentId = parentStage ? parentStage._id : null;
    } else {
      data.parentId = null;
    }
    const stage = new WorkflowStage(req.body);
    if (!stage.next_step_no) stage.next_step_no = stage.step_no + 1;
    await stage.save();
    res.json(stage);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET distinct task types
router.get("/types", async (req, res) => {
  try {
    const types = await WorkflowStage.distinct("task_type");
    res.json(types);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
