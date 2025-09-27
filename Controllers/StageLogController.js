const StageLog = require('../models/StageLog');
const { updateParentStageTotalTime } = require('../utils/updateParentStageTotalTime');

async function updateStageLog(req, res) {
  try {
    const { id } = req.params;
    const { status, start_time, end_time, files } = req.body;

    const stage = await StageLog.findById(id);
    if (!stage) return res.status(404).json({ message: 'StageLog not found' });

    if (status) stage.status = status;
    if (start_time) stage.start_time = new Date(start_time);
    if (end_time) stage.end_time = new Date(end_time);

    // calculate total_time for this stage
    if (stage.start_time && stage.end_time) {
      stage.total_time = (stage.end_time.getTime() - stage.start_time.getTime()) / 1000; // seconds
    }

    if (files) stage.files = files;

    await stage.save();

    // update parent total recursively
    if (stage.parentId) {
      await updateParentStageTotalTime(stage.parentId);
    }

    res.json({ message: 'StageLog updated successfully', stage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { updateStageLog };
