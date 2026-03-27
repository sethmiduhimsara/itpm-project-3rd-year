const mongoose = require('mongoose')

const resourceSchema = new mongoose.Schema({
  title:     { type: String, required: true, minlength: 3, maxlength: 100 },
  subject:   { type: String, required: true,
               enum: ['Mathematics','Software Engineering','Database','Networks','ITPM','Other'] },
  semester:  { type: String, required: true },
  type:      { type: String, required: true, enum: ['PDF','Link','Notes'] },
  uploader:  { type: String, required: true, minlength: 2 },
  url:       { type: String },       // Link type
  filePath:  { type: String },       // PDF type
  notesText: { type: String },       // Notes type
  reported:  { type: Boolean, default: false }
}, { timestamps: true })

module.exports = mongoose.model('Resource', resourceSchema)
