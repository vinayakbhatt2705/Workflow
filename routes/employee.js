const express = require("express");
const router = express.Router();
const Employee = require("../models/Employee");

// Create Employee
router.post("/", async (req, res) => {
  try {
    const emp = new Employee(req.body);
    await emp.save();
    res.status(201).json(emp);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all employees
router.get("/", async (req, res) => {
  try {
    const employees = await Employee.find();
    res.json(employees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Get employee by emp_code (needed for Angular getEmployeeByCode)
router.get("/:emp_code", async (req, res) => {
  try {
    const { emp_code } = req.params;
    const employee = await Employee.findOne({ emp_code });

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    res.json(employee);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
