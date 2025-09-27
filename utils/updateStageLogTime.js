const StageLog = require('../models/StageLog');

/**
 * Recalculate a parent stage's total_time based on its own duration + all children
 * @param {ObjectId} parentId - _id of the parent StageLog
 */
async function updateParentStageTotalTime(parentId) {
  if (!parentId) return;

  // fetch parent stage
  const parent = await StageLog.findById(parentId);
  if (!parent) return;

  // calculate parent's own time
  let parentTime = 0;
  if (parent.start_time && parent.end_time) {
    parentTime = (parent.end_time.getTime() - parent.start_time.getTime()) / 1000; // seconds
  }

  // sum all children total_time
  const childStages = await StageLog.find({ parentId: parent._id });
  const childrenTime = childStages.reduce((sum, child) => sum + (child.total_time || 0), 0);

  parent.total_time = parentTime + childrenTime;
  await parent.save();

  // recursively update grandparent if exists
  if (parent.parentId) {
    await updateParentStageTotalTime(parent.parentId);
  }
}

module.exports = { updateParentStageTotalTime };
