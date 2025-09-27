const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  password: { type: String, required: true },
  //proj_code: { type: String, default: null },
  proj_codes: [{ type: String, default: [] }],
  team_id: { type: String, default: null },
  created_on: { type: Date, default: Date.now },
  active: { type: String, enum: ['y','n'], default: 'y' },
  emp_code: { type: String, default: null },
  profile_id: { type: String, ref: 'Profile' },
  role: { type: String, ref: 'Role' }
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

module.exports = mongoose.model('User', userSchema);
