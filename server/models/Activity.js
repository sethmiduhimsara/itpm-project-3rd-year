const mongoose = require('mongoose')

const POINTS_MAP = { Discussion: 10, 'Help Given': 20, Resource: 15, 'Help Received': 5 }

const activitySchema = new mongoose.Schema({
  type:        { type: String, required: true,
                 enum: ['Discussion','Help Given','Resource','Help Received'] },
  description: { type: String, required: true, minlength: 5, maxlength: 150 },
  date:        { type: String, default: () => new Date().toISOString().split('T')[0] },
  points:      { type: Number }
}, { timestamps: true })

// Auto-assign points before saving
activitySchema.pre('save', function (next) {
  this.points = POINTS_MAP[this.type] ?? 10
  next()
})

module.exports = mongoose.model('Activity', activitySchema)
