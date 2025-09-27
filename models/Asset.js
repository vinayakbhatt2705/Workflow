const mongoose = require("mongoose");

const assetSchema = new mongoose.Schema({
  asset_code: { type: String, required: true, unique: true },
  asset_type: { type: String, required: true },
  asset_name: { type: String, required: true },
  asset_descr: { type: String },
  asset_ip: { type: String, default: null },
  assigned_to: { type: String }, // emp_code or contact_code
  assigned_date: { type: Date }
});

module.exports = mongoose.model("Asset", assetSchema);
