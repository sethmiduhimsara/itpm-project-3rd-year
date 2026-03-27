const Activity = require('../models/Activity')

// GET /api/activities  — all activities
exports.getActivities = async (req, res) => {
  try {
    const activities = await Activity.find().sort({ createdAt: -1 })
    res.json(activities)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
}

// GET /api/activities/summary  — stats for dashboard
exports.getSummary = async (req, res) => {
  try {
    const activities = await Activity.find()
    const totalPoints = activities.reduce((sum, a) => sum + (a.points || 0), 0)
    const level = totalPoints >= 100 ? 'Expert' : totalPoints >= 50 ? 'Intermediate' : 'Beginner'
    res.json({
      total:       activities.length,
      totalPoints,
      level,
      peersHelped: activities.filter(a => a.type === 'Help Given').length
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
}

// POST /api/activities  — log new activity
exports.createActivity = async (req, res) => {
  try {
    const activity = new Activity(req.body)
    await activity.save()
    res.status(201).json(activity)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

// DELETE /api/activities/:id
exports.deleteActivity = async (req, res) => {
  try {
    await Activity.findByIdAndDelete(req.params.id)
    res.json({ message: 'Activity deleted' })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}
