const Notification = require('../models/Notification')

// GET /api/notifications — get logged-in user's notifications
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
    res.json(notifications)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
}

// PATCH /api/notifications/mark-read — mark all as read
exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id, read: false }, { read: true })
    res.json({ message: 'All notifications marked as read' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
}

// PATCH /api/notifications/:id/read — mark one as read
exports.markOneRead = async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true }
    )
    res.json({ message: 'Notification marked as read' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
}
