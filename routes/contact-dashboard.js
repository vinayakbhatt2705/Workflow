const express = require("express");
const router = express.Router();
const Incident = require("../models/Incident");
const Employee = require("../models/Employee");
const ContactDetails = require("../models/ContactDetails");
const Asset = require("../models/Asset");

// ----------------- AUTH MIDDLEWARE -----------------
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
  const token = authHeader.split(" ")[1];
  try {
    const decoded = require("jsonwebtoken").verify(token, "your_secret_key_here");
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}

// GET dashboard data for a specific incident_no
router.get("/:incident_no", authMiddleware, async (req, res) => {
  try {
    const incidentNo = req.params.incident_no;
    console.log("dashboard", incidentNo);

    const result = await Incident.aggregate([
      { $match: { incident_no: incidentNo } },

      // Join onbehalf_of to Employee
      {
        $lookup: {
          from: "employees",
          localField: "onbehalf_of",
          foreignField: "emp_code",
          as: "employee"
        }
      },
      { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } },

      // Join contact details for the employee
      {
        $lookup: {
          from: "contactdetails",
          localField: "employee.emp_code",
          foreignField: "emp_code",
          as: "contact_details"
        }
      },

      // Join assets assigned to the employee
      {
        $lookup: {
          from: "assets",
          localField: "employee.assets",
          foreignField: "asset_code",
          as: "assets"
        }
      },

      // Project the final required fields
      {
        $project: {
          incident_no: 1,
          descr: 1,
          created_by: 1,
          onbehalf_of: 1,
          emp: {
            emp_code: "$employee.emp_code",
            emp_name: "$employee.emp_name",
            proj_code: "$employee.proj_code",
            team: "$employee.team"
          },
          contact_details: {
            contact_code: 1,
            contact_name: 1,
            addr: 1,
            landline: 1,
            mobile: 1,
            asset_codes: 1
          },
          assets: {
            asset_code: 1,
            asset_name: 1,
            asset_type: 1,
            asset_descr: 1,
            asset_ip: 1,
            assigned_date: 1
          }
        }
      }
    ]);

    if (!result || result.length === 0) {
      return res.status(404).json({ message: "Incident not found" });
    }

    res.json(result[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch dashboard data", error: err.message });
  }
});

module.exports = router;
