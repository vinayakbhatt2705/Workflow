const mongoose = require("mongoose");

// Sub-schema for stagewise logs
const IncidentDetailSchema = new mongoose.Schema({
  stageId: { type: mongoose.Schema.Types.ObjectId, ref: "WorkflowStage" },
  notes: String,
  task:String,
   status: { type: String, default: 'pending' }, // explicitly set
  stage_state:  { type: String, default: 'current' },
  updated_by: { type: String, default: 'System' },
  incident_no: { type: String, required: true }, // foreign key to incident.incident_no
  created_on: { type: Date, default: Date.now },
  updated_on: {type:Date,default:Date.now},
  files: [
        {
          filename: { type: String },   // "report.pdf"
            originalname: String,  // optional but useful
          path: { type: String },       // "/uploads/incidents/report.pdf"
          uploaded_at: { type: Date, default: Date.now }
        }
      ]
});

// Main Incident schema
const IncidentSchema = new mongoose.Schema({
  incident_no: { type: String, required: true, unique: true }, // auto-generated
  task_type: { type: String, required: true },                 // maps to WorkflowStage.task_type
  current_stage: { type: String, required: true },            // maps to WorkflowStage.task
  created_by: {type:String, required:true},
  onbehalf_of: {type:String, required:true},
  created_on: { type: Date, default: Date.now },
  updated_on: {type:Date, default:Date.now},
  assigned_to: { 
    type: String, 
    default: "emp_user"  // default value, no enum restriction
  },
  proj_code: { type: String, default: null },  // optional project code
  team: { type: String, default: null },       // optional team
  incident_details: [IncidentDetailSchema],   // array of stagewise logs
 descr: { type: String, default: null }, 
 priority: {type:Number, enum: [1,2,3,4,5], default:3},
 files: [
  {
    filename: String,
    originalname: String,
    path: String,
    uploaded_at: { type: Date, default: Date.now }
  }
],

    // 🔹 New SLA fields
    total_time: {type:Number, default :0},
  slaLimitSeconds: { type: Number, default: 0 }, // 32-bit integer
  slaBreached: { type: Boolean, default: null },  // nullable Boolean
   approver: { type: String, default: null }, // 🔹 new nullable approver
     original_user: { type: String, default: null }, // 🔹 optional
});

// 🔹 Pre-validate hook to auto-generate incident_no
IncidentSchema.pre("validate", async function (next) {
  if (this.isNew && (!this.incident_no || this.incident_no === "")) {
    try {
      const prefix = (this.task_type || "GEN").substring(0, 3).toUpperCase();

      // find last incident for this prefix
      const lastIncident = await mongoose
        .model("Incident")
        .findOne({ incident_no: new RegExp(`^${prefix}\\d+$`) })
        .sort({ created_on: -1 });

      let nextNumber = 1;
      if (lastIncident && lastIncident.incident_no) {
        const match = lastIncident.incident_no.match(/\d+$/);
        if (match) nextNumber = parseInt(match[0], 10) + 1;
      }

      this.incident_no = `${prefix}${String(nextNumber).padStart(5, "0")}`;
    } catch (err) {
      return next(err);
    }
  }
  next();
});



module.exports = mongoose.model("Incident", IncidentSchema);
