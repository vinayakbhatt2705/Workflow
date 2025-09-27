const mongoose = require('mongoose');

const savedReportSchema = new mongoose.Schema({
  name: { type: String, required: true },
 // userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String },
  selectedFields: { type: [String], default: [] },
  filters: { type: Array, default: [] },
  groupBy: { type: [String], default: [] },
  orderBy: { type: [{ field: String, direction: String }], default: [] },
  chartType: { type: String, default: 'bar' },
}, { timestamps: true });

module.exports = mongoose.model('SavedReport', savedReportSchema);
