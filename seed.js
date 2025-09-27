const mongoose = require("mongoose");
const WorkflowStage = require("./models/WorkflowStage");

mongoose
  .connect("mongodb://localhost:27017/workflow", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

async function seed() {
  try {
    // clear old data
    await WorkflowStage.deleteMany({});

    // root: Project
    const project = await WorkflowStage.create({
      task_type: "Project",
      step_no: 1,
      task: "Project",
      stage_state: "current",
      status: "in-progress",
    });

    // child: Planning under Project
    const planning = await WorkflowStage.create({
      task_type: "Planning",
      step_no: 2,
      task: "Planning",
      parentId: project._id, // 👈 keep hierarchy
      stage_state: "next",
      status: "pending",
    });

    // child: SRS under Planning
    await WorkflowStage.create({
      task_type: "SRS",
      step_no: 3,
      task: "SRS",
      parentId: planning._id, // 👈 nested child
      stage_state: "next",
      status: "pending",
    });

    console.log("✅ Seeded Project → Planning → SRS");
  } catch (err) {
    console.error("❌ Error seeding:", err);
  } finally {
    mongoose.disconnect();
  }
}

seed();
