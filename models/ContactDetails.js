const mongoose = require("mongoose");

const contactDetailsSchema = new mongoose.Schema({
  contact_code: { type: String, required: true, unique: true },
  contact_name: { type: String, required: true },
  emp_code: { type: String, ref: "Employee", default: null }, // reference by emp_code
  addr: { type: String },
  landline: { type: String },
  mobile: { type: String },
  asset_codes: [{ type: String, ref: "Asset" }] // reference asset_code
});

module.exports = mongoose.model("ContactDetails", contactDetailsSchema);
