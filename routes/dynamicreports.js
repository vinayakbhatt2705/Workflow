const express = require("express");
const router = express.Router();
const Incident = require("../models/Incident");
const WorkflowStage = require("../models/WorkflowStage");
const jwt = require("jsonwebtoken");
const JWT_SECRET = "your_secret_key_here";

// --- Auth middleware ---
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}

// --- GET available fields for dynamic reports ---
router.get("/fields", authMiddleware, async (req, res) => {
  try {
    const fields = {
      incidents: Object.keys(Incident.schema.paths).filter(f => !["_id", "__v"].includes(f)),
      stages: Object.keys(WorkflowStage.schema.paths).filter(f => !["_id", "__v"].includes(f)),
    };
    res.json(fields);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- RUN dynamic report ---
router.post("/run", authMiddleware, async (req, res) => {
  try {
    const { collection, selectedFields, filters, groupBy, chartType } = req.body;
    console.log("Filters received:", filters);

    let model;
    if (collection === "incidents") model = Incident;
    else if (collection === "stages") model = WorkflowStage;
    else return res.status(400).json({ error: "Invalid collection" });

    const pipeline = [];

    // 🔹 Always lookup StageLogs for incidents to include SLA
    if (collection === "incidents") {
      pipeline.push({
        $lookup: {
          from: "stagelogs",
          localField: "incident_no",
          foreignField: "incident_no",
          as: "stages"
        }
      });
    }

    // --- Handle slaBreached filter specially ---
    const hasSlaFilter = filters?.some(f => f.field === "slaBreached" && f.operator === "=" && f.value.toString() === "true");
    if (collection === "incidents" && hasSlaFilter) {
      pipeline.push({
        $match: { "stages.slaBreached": true }
      });
    }

    // --- Filters ---
    if (filters && filters.length > 0) {
      const andConditions = [];
      const orConditions = [];

      filters.forEach(f => {
        let value = f.value;

        if (f.field === "slaBreached" && typeof value === "string") {
          value = value.toLowerCase() === "true";
        } else if (typeof value === "string") {
          if (value.toLowerCase() === "true") value = true;
          else if (value.toLowerCase() === "false") value = false;
          else if (!isNaN(value)) value = Number(value);
        }

        const isNested = collection === "incidents" && f.field.startsWith("incident_details.");
        let condition;

        if (f.operator === "=") {
          if (isNested) {
            const nestedField = f.field.replace("incident_details.", "");
            // Removed files $exists to avoid excluding details without files
            condition = { incident_details: { $elemMatch: { [nestedField]: value } } };
          } else {
            if (f.field === "slaBreached" && collection === "incidents") return;
            condition = { [f.field]: value };
          }
        } else if (f.operator === "!=") {
          if (isNested) {
            const nestedField = f.field.replace("incident_details.", "");
            condition = { incident_details: { $elemMatch: { [nestedField]: { $ne: value } } } };
          } else {
            condition = { [f.field]: { $ne: value } };
          }
        } else if (f.operator === "contains") {
          if (isNested) {
            const nestedField = f.field.replace("incident_details.", "");
            condition = { incident_details: { $elemMatch: { [nestedField]: { $regex: value, $options: "i" } } } };
          } else {
            condition = { [f.field]: { $regex: value, $options: "i" } };
          }
        }

        if (f.logic && f.logic.toUpperCase() === "OR") orConditions.push(condition);
        else andConditions.push(condition);
      });

      let matchObj = {};
      if (andConditions.length && orConditions.length) {
        matchObj.$and = [...andConditions, { $or: orConditions }];
      } else if (andConditions.length) {
        matchObj = andConditions.length === 1 ? andConditions[0] : { $and: andConditions };
      } else if (orConditions.length) {
        matchObj = orConditions.length === 1 ? orConditions[0] : { $or: orConditions };
      }

      if (Object.keys(matchObj).length) pipeline.push({ $match: matchObj });
    }

    // --- Grouping ---
    if (groupBy && groupBy.length) {
      let groupId = {};
      if (Array.isArray(groupBy)) groupBy.forEach(f => (groupId[f] = `$${f}`));
      else groupId = `$${groupBy}`;

      const groupStage = {
        $group: {
          _id: groupId,
          count: { $sum: 1 },
        },
      };

      if (selectedFields && selectedFields.length) {
        groupStage.$group.items = { $push: "$$ROOT" };
      }

      pipeline.push(groupStage);
    } else if (selectedFields && selectedFields.length) {
      const proj = {};
      selectedFields.forEach(f => (proj[f] = 1));
      if (collection === "incidents") {
        proj.stages = 1;
        proj.incident_details = 1; // ✅ Include incident_details with files automatically
        // Removed proj.incident_details_files = "$incident_details.files";
      }
      pipeline.push({ $project: proj });
    }

    const result = await model.aggregate(pipeline);
    console.log("Result:", result);

    // 🔹 Add headers for the response
    res.setHeader("X-Total-Count", result.length);
    res.setHeader("Access-Control-Expose-Headers", "X-Total-Count");

    res.json({ data: result, chartType });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
