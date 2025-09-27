// models/StageLog.js
const mongoose = require("mongoose");
const { updateIncidentSLA } = require("../services/slaService");

const StageLogSchema = new mongoose.Schema({
  incident_id: { type: mongoose.Schema.Types.ObjectId, ref: "Incident", required: true },
  incident_no: { type: String, required: true },

  stage_id: { type: mongoose.Schema.Types.ObjectId, ref: "WorkflowStage", required: true },
  task_type: { type: String, required: true },
  task: { type: String, default: "" },

  // runtime tracking
  start_time: { type: Date, default: null },
  end_time: { type: Date, default: null },
  total_time: { type: Number, default: 0 }, // seconds

  // lifecycle/status fields
  status: {
    type: String,
    enum: ["pending", "in-progress", "complete", "confirmed"],
    default: "pending",
  },
  stage_state: {
    type: String,
    enum: ["previous", "current", "next", "disabled", "none"],
    default: "next",
  },

  // SLA and meta
  slaBreached: { type: Boolean, default: false },

  files: [
    {
      filename: { type: String },   // e.g., "report.pdf"
      originalname: {type:String},
      path: { type: String },       // e.g., "/uploads/stages/report.pdf"
      uploaded_at: { type: Date, default: Date.now }
    }
  ],

  updated_at: { type: Date, default: Date.now },
   approver: { type: String, default: null } // 🔹 new nullable approver
});

StageLogSchema.index({ incident_id: 1, stage_id: 1 }, { unique: true });

// 🔹 Hooks for auto-updating Incident SLA
StageLogSchema.post("save", async function(doc) {
  if (doc?.incident_no) await updateIncidentSLA(doc.incident_no);
});

StageLogSchema.post("remove", async function(doc) {
  if (doc?.incident_no) await updateIncidentSLA(doc.incident_no);
});

// 🔹 Middleware for updateOne / findOneAndUpdate
StageLogSchema.post("findOneAndUpdate", async function(doc) {
  if (doc?.incident_no) await updateIncidentSLA(doc.incident_no);
});

StageLogSchema.post("updateOne", async function(result) {
  // result doesn't contain doc by default, need to query incident_no
  if (this._conditions?.incident_no) {
    await updateIncidentSLA(this._conditions.incident_no);
  }
});

module.exports = mongoose.model("StageLog", StageLogSchema);
