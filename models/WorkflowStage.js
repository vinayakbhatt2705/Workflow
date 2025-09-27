const mongoose = require("mongoose");

const WorkflowStageSchema = new mongoose.Schema({
  task_type: String,
  step_no: Number,

  task: String,
    details: { type: String, default: "" },   // ✅ Add this field
  stage_state: {
    type: String,
    enum: ["previous", "current", "next", "disabled", "none"],
    default: "next",
  },
  status: {
    type: String,
    enum: ["pending", "in-progress", "complete", "confirmed", "closed"],
    default: "pending",
  },
  next_step_no: Number,
  assigned_on: Date,
  conf_date: Date,

  // SLA field in seconds
  slaLimitSeconds: { type: Number, default: 180 }, // default 3 min for testing

  logs: {
    start_time: Date,
    end_time: Date,
    total_time: Number,
    updated_at: Date,
  },

  // ✅ top-level flag
  slaBreached: { type: Boolean, default: false },

   parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "WorkflowStage",
    default: null, // null means top-level
  },

  parentTaskType: { type: String, default: null }, // string for user-friendly dropdown
});

// Pre-hook for confirm + promoting next stage
WorkflowStageSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();
  if (!update) return next();

  const WorkflowStage = mongoose.model("WorkflowStage");

  // Find the current document
  const doc = await WorkflowStage.findOne(this.getQuery()).exec();
  if (!doc) return next();

  // Only allow confirm if status was "complete"
  if (update.status === "confirmed" && doc.status === "complete") {
    console.log("Updating current stage to previous + confirmed");

    this.setUpdate({
      ...update,
      stage_state: "previous",
      status: "confirmed",
      conf_date: new Date(),
    });

    // Promote next stage if available
    if (doc.next_step_no) {
      const nextStage = await WorkflowStage.findOne({
        task_type: doc.task_type,
        step_no: doc.next_step_no,
        stage_state: { $ne: "disabled" },
      }).exec();

      if (nextStage) {
        console.log("Promoting next stage to current + in-progress");
        await WorkflowStage.updateOne(
          { _id: nextStage._id },
          {
            stage_state: "current",
            status: "in-progress",
            assigned_on: new Date(),
          }
        ).exec();
      }
    }
  }

  next();
});

module.exports = mongoose.model("WorkflowStage", WorkflowStageSchema);
