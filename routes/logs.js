// routes/logs.js
router.get("/", async (req, res) => {
  const logs = await StageLog.find();
  res.json(logs);
});