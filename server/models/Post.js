const mongoose = require('mongoose')

const replySchema = new mongoose.Schema({
  text: { type: String, required: true },
  date: { type: String, default: () => new Date().toISOString().split('T')[0] }
})

const postSchema = new mongoose.Schema({
  title:    { type: String, required: true, minlength: 5, maxlength: 100 },
  body:     { type: String, required: true, minlength: 10 },
  category: { type: String, required: true,
               enum: ['Exams','Group Issues','Lectures','Campus Life','General'] },
  author:   { type: String, required: true, minlength: 2 },
  status:   { type: String, enum: ['Visible','Hidden'], default: 'Visible' },
  replies:  [replySchema]
}, { timestamps: true })

module.exports = mongoose.model('Post', postSchema)
