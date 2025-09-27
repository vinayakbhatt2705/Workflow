const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  role_id: { type: String, required: true, unique: true },
  descr: { type: String, required: true }
});

module.exports = mongoose.model('Role', roleSchema);
