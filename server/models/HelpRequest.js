const mongoose = require('mongoose')

const responseSchema = new mongoose.Schema({
  text:   { type: String, required: true, minlength: 5 },
  helper: { type: String, required: true },
  date:   { type: String, default: () => new Date().toISOString().split('T')[0] }
})

const helpRequestSchema = new mongoose.Schema({
  subject:    { type: String, required: true,
                enum: ['Mathematics','Software Engineering','Database','Networks','ITPM','Other'] },
  topic:      { type: String, required: true, minlength: 10, maxlength: 200 },
  requester:  { type: String, required: true, minlength: 2 },
  status:     { type: String, enum: ['Open','In Progress','Closed'], default: 'Open' },
  acceptedBy: { type: String, default: null },
  responses:  [responseSchema]
}, { timestamps: true })

module.exports = mongoose.model('HelpRequest', helpRequestSchema)
