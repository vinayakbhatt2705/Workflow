// server.js
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();
const path = require('path');
const WorkflowStage = require("./routes/workflow");
const DisplayTime = require("./routes/displaytime");
const TreeView= require("./routes/treeview");
const app = express();
const Profile = require('./models/Profile');
const Role = require('./models/Role');
const User = require('./models/User');
const userRoutes = require('./routes/users');
const profileRoutes = require('./routes/profiles.js');
const roleRoutes = require('./routes/roles');
const loginRoutes=require(`./routes/auth.js`);
const dynamicReports = require("./routes/dynamicreports");
const savedReports= require("./routes/savedreports.js");
const employeeRoutes = require("./routes/employee");
const contactRoutes = require("./routes/contactDetails");
const assetRoutes = require("./routes/asset");
const contactDashboardRouter = require("./routes/contact-dashboard");
const { updateStageLogTime } = require('./utils/updateStageLogTime');
const {stagelogs}=  require('./routes/stagelogs');

app.use(cors());
app.use(bodyParser.json());

/*mongoose.connect("mongodb://localhost:27017/workflow", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.error("❌ MongoDB connection error:", err));*/

app.use(express.static(path.join(__dirname, 'dist/task-workflow')));

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("Mongo error", err));

app.use("/api/stages",WorkflowStage);
app.use("/api/displaytime", DisplayTime);
app.use("/api/treeview", TreeView);
app.use("/api/incidents", require("./routes/incidents"));
app.use('/api/users', userRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/auth', loginRoutes);
// Add after your other app.use() statements
app.use("/api/reports", dynamicReports);
app.use("/api/savedreports", savedReports);
app.use('/api/dynamicreports', require('./routes/dynamicreports'));
app.use("/api/employees", employeeRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/contact-dashboard", contactDashboardRouter);  
app.use("/api/stagelogs", stagelogs);
//app.use("api/utils/updateStageLogsTime", updateStageLogTime)  ;





// catch-all for Angular routes
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/task-workflow/index.html'));
});

app.listen(process.env.PORT, () => {
  console.log('Server running at' + process.env.MONGO_URI);
});
