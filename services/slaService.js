const mongoose = require("mongoose");




// 🔹 SLA update helper
async function updateIncidentSLA(incident_no) {
  try {
    const stageLogs = await mongoose.model("StageLog").find({ incident_no });
    const totalTime = stageLogs.reduce((sum, log) => sum + (log.total_time || 0), 0);

    const Incident = mongoose.model("Incident"); // get Incident model
    const incident = await Incident.findOne({ incident_no });
    if (!incident) return;

    incident.total_time = totalTime;
    incident.slaBreached = incident.slaLimitSeconds > 0 ? totalTime > incident.slaLimitSeconds : false;
    await incident.save();
  } catch (err) {
    console.error("Error updating SLA for incident:", incident_no, err);
  }
}




module.exports = { updateIncidentSLA };
