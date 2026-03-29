const mongoose = require('mongoose')

const resourceSchema = new mongoose.Schema({
  title:       { type: String, required: true, minlength: 3, maxlength: 100 },
  subject:     { type: String, required: true,
                 enum: ['Mathematics','Software Engineering','Database','Networks','ITPM','Other'] },
  semester:    { type: String, required: true },
  type:        { type: String, required: true, enum: ['PDF','Link','Notes'] },
  uploader:    { type: String, required: true, minlength: 2 },
  uploaderId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  url:         { type: String },
  filePath:    { type: String },
  notesText:   { type: String },
  keywords:    { type: String, default: '' },

  // Like / Dislike
  likes:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  dislikes:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Reports
  reports: [{
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason:     { type: String, default: '' },
    createdAt:  { type: Date, default: Date.now }
  }],

  // Legacy simple flag (kept for backward compat)
  reported:    { type: Boolean, default: false },

  // Auto-block
  blocked:     { type: Boolean, default: false },

}, { timestamps: true })

// Text index for full-text search
resourceSchema.index({ title: 'text', subject: 'text', keywords: 'text' })

module.exports = mongoose.model('Resource', resourceSchema)
