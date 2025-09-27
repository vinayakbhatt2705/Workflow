const mongoose = require("mongoose");
const WorkflowStage = require("./models/WorkflowStage");

mongoose.connect("mongodb://localhost:27017/workflow", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.error("❌ MongoDB connection error:", err));

async function seed() {
  try {
    // Clear existing data
    await WorkflowStage.deleteMany({});

    const stages = [
      // Task Type 01
      { step_no: 1, task: "Draft Complaint", task_type: "01", next_step_no: 2 },
      { step_no: 2, task: "File Complaint", task_type: "01", next_step_no: 3 },
      { step_no: 3, task: "Serve Notice", task_type: "01", next_step_no: 4 },

      // Task Type 02
      { step_no: 1, task: "Collect Documents", task_type: "02", next_step_no: 2 },
      { step_no: 2, task: "Verify Documents", task_type: "02", next_step_no: 3 },
      { step_no: 3, task: "Submit Application", task_type: "02", next_step_no: 4 },

      // Task Type 13B Procedure
      { step_no: 1, task: "Prepare Vakalatnama", task_type: "13B Procedure", next_step_no: 2 },
      { step_no: 2, task: "Attach Marriage Proof", task_type: "13B Procedure", next_step_no: 3 },
      { step_no: 3, task: "Attach Documents Original and Xerox", task_type: "13B Procedure", next_step_no: 4 },
      { step_no: 4, task: "Attach Vakalatnama", task_type: "13B Procedure", next_step_no: 5 },
    ];

    // Insert stages with automatic stage_state/status set by pre-save hook
    for (const s of stages) {
      const stage = new WorkflowStage(s);
      await stage.save();
    }

    console.log("✅ Workflow stages seeded successfully!");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
