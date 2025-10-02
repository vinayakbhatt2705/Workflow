const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken"); // for auth
const Incident = require("../models/Incident");
const WorkflowStage = require("../models/WorkflowStage");
const StageLog = require("../models/StageLog");
const multer = require("multer");
const path = require("path");
const upload = require("../middlewares/uploadFiles");
const { updateParentStageLogTotalTime } = require("../utils/updateStageLogTime");

const JWT_SECRET = "your_secret_key_here"; // same as auth.js

// ----------------- AUTH MIDDLEWARE -----------------
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
 // console.log("authheader " + authHeader);
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

// ----------------- MULTER SETUP FOR FILES -----------------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Make sure this folder exists
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});


// =========================================================
// CREATE NEW INCIDENT
// =========================================================
router.post("/add", authMiddleware, upload.array("files"), async (req, res) => {
  try {
    const {
      task_type,
      current_stage,
      assigned_to,
      created_by,
      updated_on,
      onbehalf_of,
      descr,
      proj_code,
      team,
      stageId,
      priority,
      slaLimitSeconds
    } = req.body;

    const incident = new Incident(req.body);
    console.log("role:" + req.user.role);

    // Attach uploaded files
    if (req.files && req.files.length) {
      incident.files = req.files.map(file => ({
        filename: file.filename,
        originalname: file.originalname,
        path: file.path
      }));
    }

    // If employee, auto-assign themselves
    if (req.user.role !== "admin") {
      incident.assigned_to = req.user.username;
    }

    await incident.save();

    // If stageId provided, create initial StageLog and push detail
    if (req.body.stageId) {
      const stageLog = new StageLog({
        incident_id: incident._id,
        incident_no: incident.incident_no,
        stage_id: req.body.stageId,
        task_type: req.body.task_type,
        task: req.body.current_stage || "",
        start_time: new Date(),
        end_time: null,
        total_time: 0,
        status: "in-progress",
        stage_state: "current",
        slaBreached: false,
        updated_at: new Date(),
      });

      await stageLog.save();
       console.log("upated on "+ req.updated_on)
      incident.incident_details.push({
        stageId: req.body.stageId,
        incident_no: incident.incident_no,
        notes: req.body.current_stage || "Initial stage",
        updated_by: req.body.assigned_to || "System",
          updated_on: req.body.updated_on ? new Date(req.body.updated_on) : new Date(),
        files: req.files ? req.files.map(file => ({
          filename: file.filename,
          originalname: file.originalname,
          path: file.path
        })) : []
      });
      await incident.save();

      return res.json({
        message: "Incident + StageLog created ✅",
        incident,
        stageLog,
      });
    }

    res.json({ message: "Incident created (no StageLog created)", incident });
  } catch (err) {
    console.error("Error creating incident:", err);
    res.status(500).json({ error: "Failed to create incident", details: err.message });
  }
});

// =========================================================
// GET ALL INCIDENTS
// =========================================================
router.get("/", authMiddleware, async (req, res) => {
  try {
    let incidents;
    console.log(req.user.proj_codes[0]);
    const projCodes = req.user.proj_codes || "";
    console.log(projCodes);

    if (req.user.role === "admin") {
      incidents = await Incident.find().populate("incident_details.stageId");
    } else {
      incidents = await Incident.find({ 
        proj_code: { $in: projCodes } 
      }).populate("incident_details.stageId");
    }
    console.log(incidents);
    res.json(incidents);
  } catch (err) {
    console.error("Error fetching incidents:", err);
    res.status(500).json({ error: err.message });
  }
});

// =========================================================
// ADD DETAIL TO AN INCIDENT
// =========================================================
router.post("/:incident_no/details", authMiddleware, upload.array("files"), async (req, res) => {
  try {
    console.log("inside incident details");
    console.log("Body received:", req.body);

    const incident_no = req.params.incident_no;
    console.log("Incident no from params:", incident_no);

    const { stageId,task, notes, updated_by, updated_on, status, stage_state } = req.body;
    const detail = {
      stageId,
      task,
      notes,
      updated_by,
        updated_on: req.body.updated_on ? new Date(req.body.updated_on) : new Date(),
      status: status || "pending",
      stage_state: stage_state || "next",
      incident_no, // 🔹 required by schema
      created_on: new Date(),
      files: req.files ? req.files.map(file => ({
        filename: file.filename,
        originalname: file.originalname,
        path: file.path
      })) : []
    };

    const incident = await Incident.findOne({ incident_no });
    if (!incident) return res.status(404).json({ error: "Incident not found" });

    incident.incident_details.push(detail);
    await incident.save();

    const existingLog = await StageLog.findOne({
      incident_id: incident._id,
      stage_id: stageId,
    });

    if (!existingLog) {
      const stage = await WorkflowStage.findById(stageId);
      await StageLog.create({
        incident_id: incident._id,
        incident_no: incident.incident_no,
        stage_id: stageId,
        task_type: stage?.task_type || incident.task_type,
        task: stage?.task || "",
        status: status || "pending",
        stage_state: stage_state || "next",
        start_time: null,
        end_time: null,
        total_time: 0,
        slaBreached: false,
        updated_at: new Date(),
      });
    }

    const updated = await Incident.findOne({ incident_no }).populate("incident_details.stageId");
    res.json(updated);
  } catch (err) {
    console.error("Error adding detail to incident:", err);
    res.status(500).json({ error: err.message });
  }
});

// =========================================================
// PUT ADD DETAIL
// =========================================================
router.post("/:incident_no/addDetail", authMiddleware, upload.array("files"), async (req, res) => {
  try {
    const { incident_no } = req.params;
    const detail = {
  stageId: req.body.stageId,
  notes: req.body.notes,
  updated_by: req.body.updated_by,
  updated_on: req.body.updated_on ? new Date(req.body.updated_on) : new Date(),
  files: req.files?.map(f => ({
    filename: f.filename,
    originalname: f.originalname,
    path: f.path
  })) || []
};
    console.log("here");

    if (req.files && req.files.length) {
      detail.files = req.files.map(file => ({
        filename: file.filename,
        originalname: file.originalname,
        path: file.path
      }));
    }

    const incident = await Incident.findOneAndUpdate(
      { incident_no },
      {
        $push: { incident_details: detail },
        $set: { updated_on: new Date() }   // 🔹 always update timestamp
      },
      { new: true }
    );

    if (!incident) return res.status(404).json({ error: "Incident not found" });

    if (req.user.role !== "admin" && String(incident.assigned_to) !== req.user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    detail.incident_no = incident_no;
   // incident.incident_details.push(detail);
   // await incident.save();

    res.json(incident);
  } catch (err) {
    console.error("Error adding detail to incident:", err);
    res.status(500).json({ error: err.message });
  }
});

// =========================================================
// UPDATE STAGE STATUS
// =========================================================
router.put("/:incident_no/stages/:stageId", authMiddleware, upload.array("files"), async (req, res) => {
  try {
    const { incident_no, stageId } = req.params;
    const { detail } = req.body;
    const { status } = req.body;

    if (req.files && req.files.length && detail) {
      detail.files = req.files.map(file => ({
        filename: file.filename,
        originalname: file.originalname,
        path: file.path
      }));
    }

    const incident = await Incident.findOneAndUpdate(
      { incident_no },
      {
        $push: { incident_details: detail },
        $set: { updated_on: new Date() }   // 🔹 always update timestamp
      },
      { new: true }
    );

    if (!incident) return res.status(404).json({ error: "Incident not found" });

    const stage = await WorkflowStage.findById(stageId);
    if (!stage) return res.status(404).json({ error: "Stage not found" });

    let log = await StageLog.findOne({
      task_type: stage.task_type,
      stage_id: stage._id,
      incident_id: incident._id,
    });

    if (!log) {
      log = new StageLog({
        task_type: stage.task_type,
        stage_id: stage._id,
        task: stage.task || "",
        incident_id: incident._id,
        incident_no,
        status: "pending",
        stage_state: "next",
        total_time: 0,
        slaBreached: false,
      });
    }

    const now = new Date();

    if (status === "in-progress") {
      if (!log.start_time) log.start_time = now;
      log.end_time = null;
      log.status = "in-progress";
      log.stage_state = "current";
    }

    if (log.start_time && status !== "in-progress" && log.status === "in-progress") {
      log.end_time = now;
      const diffSeconds = Math.floor((log.end_time - log.start_time) / 1000);
      log.total_time = (log.total_time || 0) + diffSeconds;
      log.start_time = null;
    }

    if (status === "complete") {
      log.status = "complete";
      log.stage_state = "previous";

      if (stage.slaLimitSeconds && (log.total_time || 0) > stage.slaLimitSeconds) {
        log.slaBreached = true;
      }

      const stages = await WorkflowStage.find({ task_type: stage.task_type }).sort({ step_no: 1 });
      const currentIndex = stages.findIndex((s) => s._id.equals(stage._id));
      const nextStage = stages[currentIndex + 1];

      if (nextStage) {
        await StageLog.create({
          incident_id: incident._id,
          incident_no,
          stage_id: nextStage._id,
          task_type: nextStage.task_type,
          task: nextStage.task,
          status: "in-progress",
          stage_state: "current",
          start_time: new Date(),
          total_time: 0,
          slaBreached: false,
          updated_at: new Date(),
        });

        incident.current_stage = nextStage.task;
      }
    }

    if (status === "confirmed") {
      log.status = "confirmed";
      log.stage_state = "previous";
    }

    if (status === "pending") {
      log.status = "pending";
      log.start_time = null;
      log.end_time = null;
    }

    if (stage.slaLimitSeconds && (log.total_time || 0) > stage.slaLimitSeconds) {
      log.slaBreached = true;
    }

    log.updated_at = now;
    await log.save();

    incident.status = status;
    await incident.save();

    res.json({ incident, stage, log });
  } catch (err) {
    console.error("Error updating stage status:", err);
    res.status(500).json({ error: err.message });
  }
});

// =========================================================
// GET STAGES OF INCIDENT
// =========================================================
router.get("/:incident_no/stages", authMiddleware, async (req, res) => {
  try {
    const { incident_no } = req.params;
    const incident = await Incident.findOne({ incident_no });
    if (!incident) return res.status(404).json({ error: "Incident not found" });

    const stages = await WorkflowStage.find({ task_type: incident.task_type }).sort({ step_no: 1 });
    const now = Date.now();

    const response = await Promise.all(
      stages.map(async (stage) => {
        const log = await StageLog.findOne({
          task_type: stage.task_type,
          task:stage.task,
          incident_id: incident._id,
        });

        const dbTotalTime = log?.total_time ?? 0;
        const elapsedSeconds =
          log?.start_time && !log?.end_time
            ? dbTotalTime + Math.floor((now - new Date(log.start_time).getTime()) / 1000)
            : dbTotalTime;

        let slaBreached = log?.slaBreached || false;
        if (stage.slaLimitSeconds && elapsedSeconds > stage.slaLimitSeconds) {
          slaBreached = true;
          if (log && !log.slaBreached) {
            log.slaBreached = true;
            await log.save();
          }
        }

        return {
          ...stage.toObject(),
          dbTotalTime,
          elapsedSeconds,
          slaBreached,
          stage_state: log?.stage_state || "next",
          status: log?.status || "pending",
          files: log?.files || []
        };
      })
    );

    res.json({ incident, stages: response });
  } catch (err) {
    console.error("Error fetching stages for incident:", err);
    res.status(500).json({ error: err.message });
  }
});

// =========================================================
// UPDATE INCIDENT (REASSIGN / PRIORITY / FILES)
// =========================================================
router.put("/:incident_no", authMiddleware, upload.array("files"), async (req, res) => {
  try {
    console.log("inside in put");
    const { incident_no } = req.params;
    //const payload = req.body;

    const incident = await Incident.findOne({ incident_no });
    if (!incident) return res.status(404).json({ error: "Incident not found" });

    const updateData = {
      ...req.body,
      updated_on: req.body.updated_on ? new Date(req.body.updated_on) : new Date(),
      // Preserve some original fields if needed
      created_by: incident.created_by,
      onbehalf_of: incident.onbehalf_of,
      current_stage: req.body.current_stage || incident.current_stage,
      task_type: req.body.task_type || incident.task_type,
      assigned_to: req.body.assigned_to || incident.assigned_to,
      proj_code: req.body.proj_code ?? incident.proj_code,
      team: req.body.team ?? incident.team,
      descr: req.body.descr ?? incident.descr,
      priority: req.body.priority ?? incident.priority,
      ref_no: req.body.ref_no ?? incident.ref_no,
      reminder: req.body.reminder ?? incident.reminder,
      next_date: req.body.next_date ? new Date(req.body.next_date) : incident.next_date,
      total_time: req.body.total_time ?? incident.total_time,
      slaLimitSeconds: req.body.slaLimitSeconds ?? incident.slaLimitSeconds,
      slaBreached: req.body.slaBreached ?? incident.slaBreached,
      approver: req.body.approver ?? incident.approver,
      original_user: req.body.original_user ?? incident.original_user
    };

    if (req.files && req.files.length) {
      updateData.files = req.files.map(file => ({
        filename: file.filename,
        originalname: file.originalname,
        path: file.path,
          uploaded_at: new Date()
      }));
    }

    if (req.user.role !== "admin") {
    //  return res.status(403).json({ message: "Forbidden: Only admin can update incident" });
    }
// Update incident details if provided
    if (req.body.incident_details && Array.isArray(req.body.incident_details)) {
      // Optional: merge existing incident_details with new ones
      updateData.incident_details = [...(incident.incident_details || []), ...req.body.incident_details];
    }


    Object.assign(incident, updateData);
    await incident.save();

    res.json(incident);
  } catch (err) {
    console.error("Error updating incident:", err);
    res.status(500).json({ error: err.message });
  }
});


// =========================================================
// GET CURRENT STAGE + APPROVER FOR INCIDENT
// =========================================================
router.get("/:incident_no/current-stage", authMiddleware, async (req, res) => {
  try {
    const { incident_no } = req.params;

    // find the current stage log
    const stageLog = await StageLog.findOne({
      incident_no,
      stage_state: "current"
    }).populate("stage_id"); // optional populate for stage details

    if (!stageLog) {
      return res.status(404).json({ message: "No current stage found for this incident" });
    }

    res.json({
      stage: stageLog.stage_id?.task || null,
      approver: stageLog.approver || null,
      status: stageLog.status,
      stageLog
    });
  } catch (err) {
    console.error("Error fetching current stage log:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET INCIDENT BY INCIDENT_NO
router.get("/:incident_no", authMiddleware, async (req, res) => {
  try {
    const { incident_no } = req.params;

    const incident = await Incident.findOne({ incident_no }).populate("incident_details.stageId");
    if (!incident) return res.status(404).json({ error: "Incident not found" });

    res.json(incident);
  } catch (err) {
    console.error("Error fetching incident by number:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /:incident_no/stages/:stageId/approver
router.put("/:incident_no/stages/:stageId/approver", authMiddleware, async (req, res) => {
  try {
    const { incident_no, stageId } = req.params;
    const { approver } = req.body;
    if (!approver) return res.status(400).json({ message: "approver required" });

    const incident = await Incident.findOne({ incident_no });
    if (!incident) return res.status(404).json({ message: "Incident not found" });

    const stageLog = await StageLog.findOne({ incident_id: incident._id, stage_id: stageId });
    if (!stageLog) {
      // create one if missing
      const newLog = await StageLog.create({
        incident_id: incident._id,
        incident_no,
        stage_id: stageId,
        approver,
        status: "pending",
        stage_state: "next",
        total_time: 0,
        updated_at: new Date()
      });
      return res.json({ stageLog: newLog });
    }

    stageLog.approver = approver;
    stageLog.updated_at = new Date();
    await stageLog.save();
    res.json({ stageLog });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}); 

router.put('/:incident_no/original-user', authMiddleware, async (req, res) => {
  try {
    const { incident_no } = req.params;
    const { original_user } = req.body;
    if (!original_user) return res.status(400).json({ message: 'original_user required' });

    const incident = await Incident.findOne({ incident_no });
    if (!incident) return res.status(404).json({ message: 'Incident not found' });

    incident.original_user = original_user;
    await incident.save();

    res.json({ message: 'Original user saved ✅', incident });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:incident_no/original-user', authMiddleware, async (req, res) => {
  try {
    const { incident_no } = req.params;
    const incident = await Incident.findOne({ incident_no });
    if (!incident) return res.status(404).json({ message: 'Incident not found' });
    res.json({ original_user: incident.original_user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get("/reminders/upcoming-reminders", authMiddleware, async (req, res) => {
  try {

    console.log("reached upcoming");
    const today = new Date();
    const twoDaysLater = new Date();
    twoDaysLater.setDate(today.getDate() + 2);

    const incidents = await Incident.find({
      next_date: { $gte: today, $lte: twoDaysLater }
    }).select("incident_no ref_no descr reminder next_date").sort({ next_date: 1 });

    res.json(incidents);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch reminders", error: err.message });
  }
});
// =========================================================
// REST OF YOUR INCIDENT ROUTES
// Keep all your stage update, get stages, update incident etc.
// Just wrap routes with authMiddleware
// And check `req.user.role !== admin` to allow only assigned incidents for employee
// =========================================================

module.exports = router;
