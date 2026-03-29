const mongoose = require("mongoose");

const replySchema = new mongoose.Schema({
  text: { type: String, required: true, minlength: 3, maxlength: 500 },
  author: { type: String, minlength: 2, default: "Student" },
  authorId: { type: String, default: "" },
  date: { type: String, default: () => new Date().toISOString().split("T")[0] },
  helpfulBy: { type: [String], default: [] },
  helpfulCount: { type: Number, default: 0, min: 0 },
});

const reportSchema = new mongoose.Schema(
  {
    reporterId: { type: String, required: true },
    reporterName: { type: String, required: true, minlength: 2 },
    reason: { type: String, required: true, minlength: 5, maxlength: 500 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const postSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, minlength: 5, maxlength: 100 },
    body: { type: String, required: true, minlength: 10 },
    category: {
      type: String,
      required: true,
      enum: ["Exams", "Group Issues", "Lectures", "Campus Life", "General"],
    },
    author: { type: String, required: true, minlength: 2 },
    ownerId: { type: String, index: true },
    status: { type: String, enum: ["Visible", "Hidden"], default: "Visible" },
    discussionStatus: {
      type: String,
      enum: ["Open", "Resolved"],
      default: "Open",
    },
    likedBy: { type: [String], default: [] },
    dislikedBy: { type: [String], default: [] },
    likesCount: { type: Number, default: 0, min: 0 },
    dislikesCount: { type: Number, default: 0, min: 0 },
    replies: [replySchema],
    reports: { type: [reportSchema], default: [] },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Post", postSchema);
