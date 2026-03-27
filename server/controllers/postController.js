const Post = require('../models/Post')

// GET /api/posts  — get all posts, optional ?category=Exams
exports.getPosts = async (req, res) => {
  try {
    const filter = {}
    if (req.query.category && req.query.category !== 'All') {
      filter.category = req.query.category
    }
    const posts = await Post.find(filter).sort({ createdAt: -1 })
    res.json(posts)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
}

// POST /api/posts  — create a new post
exports.createPost = async (req, res) => {
  try {
    const post = new Post(req.body)
    await post.save()
    res.status(201).json(post)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

// POST /api/posts/:id/replies  — add a reply
exports.addReply = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
    if (!post) return res.status(404).json({ message: 'Post not found' })
    post.replies.push({ text: req.body.text })
    await post.save()
    res.json(post)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

// PATCH /api/posts/:id/status  — admin hide/show
exports.updateStatus = async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    )
    res.json(post)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

// DELETE /api/posts/:id  — delete a post
exports.deletePost = async (req, res) => {
  try {
    await Post.findByIdAndDelete(req.params.id)
    res.json({ message: 'Post deleted' })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}
