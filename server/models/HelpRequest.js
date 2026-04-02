const mongoose = require('mongoose')

const responseSchema = new mongoose.Schema({
  text: { type: String, required: true },
  sender: { type: String, required: true },
  role: { type: String, enum: ['Requester', 'Helper'], required: true },
  date: { type: String, default: () => new Date().toISOString() }
})

const helpRequestSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  title: { type: String, required: true, minlength: 5, maxlength: 100 },
  description: { type: String, required: true, minlength: 10 },
  requester: { type: String, required: true },
  fileUrl: { type: String, default: null },
  visibility: { type: String, enum: ['Public', 'Private'], default: 'Public' },
  targetStudent: { type: String, default: null },
  urgency: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  status: { type: String, enum: ['Open', 'In Progress', 'Closed'], default: 'Open' },
  acceptedBy: { type: String, default: null },
  acceptedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  responses: [responseSchema]
}, { timestamps: true })

module.exports = mongoose.model('HelpRequest', helpRequestSchema)
