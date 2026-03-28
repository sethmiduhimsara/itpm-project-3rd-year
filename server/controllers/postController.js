const Post = require("../models/Post");

const DISCUSSION_STATUSES = new Set(["Open", "Resolved"]);
const MODERATION_STATUSES = new Set(["Visible", "Hidden"]);

function isOwnerOrAdmin(post, user) {
  if (!post || !user) return false;
  if (user.role === "admin") return true;
  if (post.ownerId && String(post.ownerId) === String(user._id)) return true;
  return post.author === user.name;
}

// GET /api/posts  — get all posts, optional ?category=Exams
exports.getPosts = async (req, res) => {
  try {
    const filter = {};
    if (req.query.category && req.query.category !== "All") {
      filter.category = req.query.category;
    }
    // Students should never see hidden posts.
    if (req.user?.role !== "admin") {
      filter.status = "Visible";
    }
    const posts = await Post.find(filter).sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/posts  — create a new post
exports.createPost = async (req, res) => {
  try {
    const post = new Post({
      title: req.body.title,
      body: req.body.body,
      category: req.body.category,
      author: req.user.name,
      ownerId: String(req.user._id),
      discussionStatus: "Open",
    });
    await post.save();
    res.status(201).json(post);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// POST /api/posts/:id/replies  — add a reply
exports.addReply = async (req, res) => {
  try {
    const text = String(req.body.text || "").trim();
    if (text.length < 3) {
      return res
        .status(400)
        .json({ message: "Reply must be at least 3 characters" });
    }

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    post.replies.push({
      text,
      author: req.user.name,
      authorId: String(req.user._id),
    });
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// PATCH /api/posts/:id/discussion-status  — owner/admin open/resolved
exports.updateDiscussionStatus = async (req, res) => {
  try {
    const nextStatus = String(req.body.discussionStatus || "");
    if (!DISCUSSION_STATUSES.has(nextStatus)) {
      return res.status(400).json({ message: "Invalid discussion status" });
    }

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (!isOwnerOrAdmin(post, req.user)) {
      return res
        .status(403)
        .json({ message: "Not allowed to update this post status" });
    }

    post.discussionStatus = nextStatus;
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// PATCH /api/posts/:postId/replies/:replyId/helpful  — toggle helpful reaction
exports.toggleReplyHelpful = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const reply = post.replies.id(req.params.replyId);
    if (!reply) return res.status(404).json({ message: "Reply not found" });

    const userId = String(req.user._id);
    const hasReacted = reply.helpfulBy.includes(userId);

    if (hasReacted) {
      reply.helpfulBy = reply.helpfulBy.filter((id) => id !== userId);
    } else {
      reply.helpfulBy.push(userId);
    }

    reply.helpfulCount = reply.helpfulBy.length;
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// PATCH /api/posts/:id/status  — admin hide/show
exports.updateStatus = async (req, res) => {
  try {
    const nextStatus = String(req.body.status || "");
    if (!MODERATION_STATUSES.has(nextStatus)) {
      return res.status(400).json({ message: "Invalid moderation status" });
    }

    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { status: nextStatus },
      { new: true },
    );
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json(post);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE /api/posts/:id  — delete a post
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (!isOwnerOrAdmin(post, req.user)) {
      return res
        .status(403)
        .json({ message: "Not allowed to delete this post" });
    }

    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: "Post deleted" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
