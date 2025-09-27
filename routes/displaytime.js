const express = require("express");
const router = express.Router();
const WorkflowStage = require("../models/WorkflowStage");
const StageLog = require("../models/StageLog");
const Incident = require("../models/Incident"); // ✅ Add this line

// ----------------- Existing /active route -----------------
router.get("/active", async (req, res) => {
  try {
    const stages = await WorkflowStage.aggregate([
      { $match: { stage_state: "current" } },
      {
        $lookup: {
          from: "stagelogs",
          localField: "_id",
          foreignField: "stage_id",
          as: "logs",
        },
      },
      { $unwind: { path: "$logs", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          task_type: 1,
          step_no: 1,
          task: 1,
          stage_state: 1,
          status: 1,
          next_step_no: 1,
          assigned_on: 1,
          conf_date: 1,
          slaBreached: 1,
          "logs._id": 1,
          "logs.start_time": 1,
          "logs.end_time": 1,
          "logs.total_time": 1,
          "logs.files": 1, // ✅ Added: include files array from StageLogs if any
        },
      },
    ]);

    const now = Date.now();

    const response = await Promise.all(
      stages.map(async (s) => {
        const totalTime = Number(s.logs?.total_time ?? 0);
        let elapsed = totalTime;

        if (s.status === "in-progress" && s.logs?.start_time && !s.logs?.end_time) {
          const start = new Date(s.logs.start_time).getTime();
          if (!isNaN(start)) elapsed += Math.floor((now - start) / 1000);
        }

        if (!s.slaBreached && s.slaLimitSeconds && elapsed > s.slaLimitSeconds) {
          s.slaBreached = true;
          if (s.logs?._id) await StageLog.updateOne({ _id: s.logs._id }, { slaBreached: true });
          await WorkflowStage.updateOne({ _id: s._id }, { slaBreached: true });
        }

        return {
          ...s,
          dbTotalTime: totalTime,
          elapsedSeconds: elapsed,
          slaBreached: s.slaBreached ?? false,
          files: s.logs?.files ?? [], // ✅ Added files in response
        };
      })
    );

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch active stages" });
  }
});

// ----------------- NEW /active/:incident_no route -----------------
// GET active stages for a given incident_no
// ✅ Get active workflow stages by incident_no
router.get("/active/:incident_no", async (req, res) => {
  try {
    const { incident_no } = req.params;
    console.log("Fetching active stages for incident:", incident_no);

    const stages = await Incident.aggregate([
      // 1️⃣ Match the incident by incident_no
      { $match: { incident_no: incident_no } },

      // 2️⃣ Lookup related StageLogs
      {
        $lookup: {
          from: "stagelogs",
          localField: "_id",        // Incident._id
          foreignField: "incident_id", // StageLog.incident_id
          as: "logs"
        }
      },
      { $unwind: { path: "$logs", preserveNullAndEmptyArrays: true } },

      // 3️⃣ Lookup WorkflowStage for each log
      {
        $lookup: {
          from: "workflowstages",
          localField: "logs.stage_id",
          foreignField: "_id",
          as: "stage"
        }
      },
      { $unwind: { path: "$stage", preserveNullAndEmptyArrays: true } },

      // 4️⃣ Project the combined fields
      {
        $project: {
          incident_no: 1,
          task_type: "$stage.task_type",
          step_no: "$stage.step_no",
          task: "$stage.task",
          stage_state: "$stage.stage_state",
          status: "$stage.status",
          slaLimitSeconds: "$stage.slaLimitSeconds",
          // StageLog fields
          log_id: "$logs._id",
          start_time: "$logs.start_time",
          end_time: "$logs.end_time",
          total_time: "$logs.total_time",
          files: "$logs.files", // ✅ Include files from StageLog
          slaBreached: { $ifNull: ["$logs.slaBreached", false] }
        }
      }
    ]);

    const now = Date.now();

    // 5️⃣ Add SLA calculations in JS
    const response = await Promise.all(
      stages.map(async (s) => {
        const totalTime = Number(s.total_time ?? 0);
        let elapsed = totalTime;
         console.log("entering in progress" + s.status+" " + s.start_time );
        if (s.status === "in-progress" && s.start_time && !s.end_time) {
          console.log("inside in progress");
          const start = new Date(s.start_time).getTime();
          if (!isNaN(start)) elapsed += Math.floor((now - start) / 1000);
        }

        if (!s.slaBreached && s.slaLimitSeconds && elapsed > s.slaLimitSeconds) {
          s.slaBreached = true;
          if (s.log_id) {
            await StageLog.updateOne({ _id: s.log_id }, { slaBreached: true });
          }
          await WorkflowStage.updateOne({ _id: s.stage_id }, { slaBreached: true });
        }

        return {
          ...s,
          dbTotalTime: totalTime,
          elapsedSeconds: elapsed,
          slaBreached: s.slaBreached ?? false,
           files: s.files ?? [], // ✅ Include files in response
        };
      })
    );

    res.json(response);
  } catch (err) {
    console.error("Error fetching active stages:", err);
    res.status(500).json({ error: "Failed to fetch active stages for incident" });
  }
});
// ----------------- GET all stages -----------------
router.get("/", async (req, res) => {
  try {
    const stages = await WorkflowStage.aggregate([
      {
        $lookup: {
          from: "stagelogs",
          localField: "_id",
          foreignField: "stage_id",
          as: "logs",
        },
      },
      { $unwind: { path: "$logs", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          task_type: 1,
          step_no: 1,
          task: 1,
          stage_state: 1,
          status: 1,
          next_step_no: 1,
          assigned_on: 1,
          conf_date: 1,
          slaBreached: 1,
          "logs._id": 1,
          "logs.start_time": 1,
          "logs.end_time": 1,
          "logs.total_time": 1,
           "logs.files": 1, // ✅ Added files array from StageLogs
          slaBreached: { $ifNull: ["$logs.slaBreached", false] },
        },
      },
    ]);

    const now = Date.now();

    const response = await Promise.all(
      stages.map(async (s) => {
        const totalTime = Number(s.logs?.total_time ?? 0);
        let elapsed = totalTime;

        if (s.status === "in-progress" && s.logs?.start_time && !s.logs?.end_time) {
          const start = new Date(s.logs.start_time).getTime();
          if (!isNaN(start)) elapsed += Math.floor((now - start) / 1000);
        }

        if (!s.slaBreached && s.slaLimitSeconds && elapsed > s.slaLimitSeconds) {
          s.slaBreached = true;
          if (s.logs?._id) await StageLog.updateOne({ _id: s.logs._id }, { slaBreached: true });
          await WorkflowStage.updateOne({ _id: s._id }, { slaBreached: true });
        }

        return {
          ...s,
          dbTotalTime: totalTime,
          elapsedSeconds: elapsed,
          slaBreached: s.slaBreached ?? false,
           files: s.logs?.files ?? [], // ✅ Include files in response
        };
      })
    );

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch stages with logs" });
  }
});

module.exports = router;
