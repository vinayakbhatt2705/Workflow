const mongoose = require('mongoose');
const User = require('./models/User');
const Profile = require('./models/Profile');
const Role = require('./models/Role');

// MongoDB connection
mongoose.connect('mongodb://127.0.0.1:27017/workflow', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function seed() {
  try {
    // Clear old data
   // await User.deleteMany({});
   // await Profile.deleteMany({});
   // await Role.deleteMany({});

   // console.log("Cleared old data ✅");

    // Insert Profiles (default with all permissions true)
   /* const profiles = await Profile.insertMany([
      { profile_id: 'ADMIN_PROFILE', descr: 'Admin Profile', add: true, edit: true, delete: true, view: true },
      { profile_id: 'EMP_PROFILE', descr: 'Employee Profile', add: true, edit: true, delete: false, view: true },
      { profile_id: 'GUEST_PROFILE', descr: 'Guest Profile', add: false, edit: false, delete: false, view: true },
    ]);

    // Insert Roles
    const roles = await Role.insertMany([
      { role_id: 'admin', descr: 'Administrator' },
      { role_id: 'employee', descr: 'Employee' },
      { role_id: 'guest', descr: 'Guest User' },
    ]);*/

    // Insert Users
    const users = await User.insertMany([
      {
        uid: 'U004',
        username: 'admin',
        password: 'admin123',   // ⚠️ In real apps, hash with bcrypt
        profile_id: 'ADMIN_PROFILE',
        role: 'admin',
        active: 'y'
      },
      {
        uid: 'U005',
        username: 'emp_user1',
        password: 'emp123',
        profile_id: 'EMP_PROFILE',
        role: 'employee',
        active: 'y'
      },
      {
        uid: 'U006',
        username: 'emp_user2',
        password: 'guest123',
        profile_id: 'EMP_PROFILE',
        role: 'employee',
        active: 'y'
      }
    ]);

    console.log("Seed data added ✅");
   // console.log({ profiles, roles, users });

  } catch (err) {
    console.error("Error seeding:", err);
  } finally {
    mongoose.connection.close();
  }
}

seed();
