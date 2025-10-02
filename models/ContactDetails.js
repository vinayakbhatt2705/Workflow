const mongoose = require("mongoose");

const contactDetailsSchema = new mongoose.Schema({
  contact_code: { type: String, required: true, unique: true },
  contact_name: { type: String, required: true },
  emp_code: { type: String, ref: "Employee", default: null },
  addr: { type: String },
  landline: { type: String },
  mobile: { type: String },
  aadhar: { type: String, default: null },
  pan: { type: String, default: null },
  files: [
    {
      filename: String,
      originalname: String,
      path: String,
      uploaded_at: { type: Date, default: Date.now }
    }
  ],
  ref_no: [{ type: String, default: null }],
  asset_codes: [{ type: String, ref: "Asset" }]
});

module.exports = mongoose.model("ContactDetails", contactDetailsSchema);
