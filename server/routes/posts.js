const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { adminOnly } = require("../middleware/authMiddleware");
const {
  getPosts,
  createPost,
  addReply,
  updateStatus,
  deletePost,
  updateDiscussionStatus,
  toggleReplyHelpful,
  togglePostReaction,
  reportPost,
  clearReports,
} = require("../controllers/postController");

const MAX_POST_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_REPLY_IMAGE_BYTES = 3 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const prefix = file.fieldname === "replyImage" ? "reply" : "post";
    cb(
      null,
      `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`,
    );
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_POST_IMAGE_BYTES },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
      return;
    }

    const err = new Error("Only JPG, PNG, WEBP, and GIF images are allowed");
    err.status = 400;
    cb(err);
  },
});

const handlePostImageUpload = (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (!err) {
      next();
      return;
    }

    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ message: "Image size must be 5MB or less" });
      return;
    }

    res
      .status(err.status || 400)
      .json({ message: err.message || "Invalid image upload" });
  });
};

const replyUpload = multer({
  storage,
  limits: { fileSize: MAX_REPLY_IMAGE_BYTES },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
      return;
    }

    const err = new Error("Only JPG, PNG, WEBP, and GIF images are allowed");
    err.status = 400;
    cb(err);
  },
});

const handleReplyImageUpload = (req, res, next) => {
  replyUpload.single("replyImage")(req, res, (err) => {
    if (!err) {
      next();
      return;
    }

    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ message: "Reply image size must be 3MB or less" });
      return;
    }

    res
      .status(err.status || 400)
      .json({ message: err.message || "Invalid image upload" });
  });
};

router.get("/", getPosts);
router.post("/", handlePostImageUpload, createPost);
router.post("/:id/replies", handleReplyImageUpload, addReply);
router.post("/:id/report", reportPost);
router.patch("/:id/discussion-status", updateDiscussionStatus);
router.patch("/:id/reaction", togglePostReaction);
router.patch("/:postId/replies/:replyId/helpful", toggleReplyHelpful);
router.patch("/:id/reports/clear", adminOnly, clearReports);
router.patch("/:id/status", adminOnly, updateStatus); // admin only
router.delete("/:id", deletePost);

module.exports = router;
