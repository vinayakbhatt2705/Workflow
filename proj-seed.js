// proj-seed.js
const mongoose = require("mongoose");
const User = require("./models/User.js");
const Incident = require("./models/Incident.js");

// ✅ Connect to DB
mongoose
  .connect("mongodb://localhost:27017/workflow", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

async function runSeed() {
  try {
    // Step 1: Update emp_user with proj_codes
    const empUser = await User.findOneAndUpdate(
      { username: "emp_user" },
      { $set: { proj_codes: ["Proj-A"] } }, // assuming proj_codes is an array in User model
      { new: true }
    );

    console.log("Updated user:", empUser?.username, empUser?.proj_codes);

    // Step 2: Update incidents for emp_user (match by assigned_to username)
    if (empUser) {
      const result = await Incident.updateMany(
        { assigned_to: empUser.username },
        { $set: { proj_code: "Proj-A" } }
      );
      console.log(`Updated ${result.modifiedCount} incidents for emp_user`);
    }

    // Step 3: Add sample incidents for other projects
    await Incident.create([
      {
        task_type: "Bug",
        current_stage: "New",
        assigned_to: "Agent2",
        proj_code: "Proj-B",
      },
      {
        task_type: "CR",
        current_stage: "In Progress",
        assigned_to: "Agent3",
        proj_code: "Proj-C",
      },
    ]);

    console.log("✅ Seed completed.");
  } catch (err) {
    console.error("❌ Seed error:", err);
  } finally {
    mongoose.disconnect();
  }
}

runSeed();
