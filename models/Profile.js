const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  profile_id: { type: String, required: true, unique: true },
  descr: { type: String, required: true },
  ang_comp: { type: String, default: null },
  add: { type: Boolean, default: false },
  edit: { type: Boolean, default: false },
  delete: { type: Boolean, default: false },
  view: { type: Boolean, default: true }
});

module.exports = mongoose.model('Profile', profileSchema);