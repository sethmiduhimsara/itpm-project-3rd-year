const express = require("express");
const router = express.Router();
const { adminOnly } = require("../middleware/authMiddleware");
const {
  getPosts,
  createPost,
  addReply,
  updateStatus,
  deletePost,
  updateDiscussionStatus,
  toggleReplyHelpful,
} = require("../controllers/postController");

router.get("/", getPosts);
router.post("/", createPost);
router.post("/:id/replies", addReply);
router.patch("/:id/discussion-status", updateDiscussionStatus);
router.patch("/:postId/replies/:replyId/helpful", toggleReplyHelpful);
router.patch("/:id/status", adminOnly, updateStatus); // admin only
router.delete("/:id", deletePost);

module.exports = router;
