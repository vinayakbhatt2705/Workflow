const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
  emp_code: { type: String, required: true, unique: true },
  emp_name: { type: String, required: true },
  dept: { type: String, default: null },
  dob: { type: Date, required: true },
  doj: { type: Date, required: true },
  doe: { type: Date, default: null },
  active: { type: String, enum: ["Y", "N"], default: "Y" },
  proj_code: { type: String, default: null },
  team: { type: String, required: true },
  contact_details: [{ type: String }], // array of contact info strings
  system_type: { type: String, default: null },
  assets: [{ type: String }] ,// store asset codes
  approver: { type: String, default: null } // 🔹 new nullable approve
});

module.exports = mongoose.model("Employee", employeeSchema);
