const Resource     = require('../models/Resource')
const Notification = require('../models/Notification')

// ─── Thresholds for auto-block ─────────────────────────────────────────────
const REPORT_THRESHOLD  = 5          // block if >= 5 reports
const DISLIKE_RATIO     = 0.5        // block if dislikes / (likes+dislikes) > 50%
const DISLIKE_MIN_VOTES = 5          // only apply ratio check after 5 total votes

// Helper — check thresholds and block + notify if needed
async function maybeBlock(resource) {
  if (resource.blocked) return

  const reportCount  = resource.reports.length
  const likeCount    = resource.likes.length
  const dislikeCount = resource.dislikes.length
  const totalVotes   = likeCount + dislikeCount

  const shouldBlock =
    reportCount >= REPORT_THRESHOLD ||
    (totalVotes >= DISLIKE_MIN_VOTES && dislikeCount / totalVotes > DISLIKE_RATIO)

  if (!shouldBlock) return

  resource.blocked  = true
  resource.reported = true
  await resource.save()

  // Send in-app notification to the uploader
  await Notification.create({
    userId:  resource.uploaderId,
    title:   'Your resource has been flagged',
    message: `Your resource "${resource.title}" has been flagged by multiple users. Please review or remove it.`,
  })
}

// ── GET /api/resources  — list, filter, search, sort, paginate ───────────────
exports.getResources = async (req, res) => {
  console.log('getResources called', { user: req.user?.email, query: req.query })
  try {
    const { subject, semester, search, sort, page = 1, limit = 20, mine, reported } = req.query
    const filter = {}

    // ?mine=true  → only this user's uploads (any blocked status)
    // ?reported=true → only this user's reported/blocked uploads
    if (mine && mine !== 'false') {
      filter.uploaderId = req.user._id
    } else if (reported && reported !== 'false') {
      filter.uploaderId = req.user._id
      filter['reports.0'] = { $exists: true }
    } else {
      filter.blocked = false
    }

    if (subject  && subject  !== 'All') filter.subject  = subject
    if (semester && semester !== 'All') filter.semester = semester

    let query
    if (search && search.trim()) {
      // Full-text search across title, subject, keywords
      query = Resource.find(
        { ...filter, $text: { $search: search.trim() } },
        { score: { $meta: 'textScore' } }
      )
      if (sort === 'likes') {
        query = query.sort({ likes: -1, createdAt: -1 })
      } else {
        query = query.sort({ score: { $meta: 'textScore' }, createdAt: -1 })
      }
    } else {
      query = Resource.find(filter)
      if (sort === 'likes') {
        query = query.sort({ likesCount: -1, createdAt: -1 })
      } else {
        query = query.sort({ createdAt: -1 })
      }
    }

    const skip  = (Number(page) - 1) * Number(limit)
    const total = await Resource.countDocuments(filter)
    const resources = await query.skip(skip).limit(Number(limit))

    res.json({ resources, total, page: Number(page), pages: Math.ceil(total / Number(limit)) })
  } catch (err) {
    res.status(500).json({ message: 'Server error', detail: err.message })
  }
}

// ── POST /api/resources  — upload new resource ────────────────────────────────
exports.createResource = async (req, res) => {
  try {
    const title = (req.body.title || '').trim()
    const keywords = (req.body.keywords || '').trim()
    const titlePattern = /^[A-Za-z0-9\s\-_,.]{3,100}$/
    const keywordsPattern = /^[A-Za-z0-9\s,]*$/

    if (!title) return res.status(400).json({ message: 'Resource title is required.' })
    if (!titlePattern.test(title)) {
      return res.status(400).json({ message: 'Title must be 3-100 chars and only letters, numbers, spaces, - _ , . allowed.' })
    }
    if (keywords && !keywordsPattern.test(keywords)) {
      return res.status(400).json({ message: 'Keywords may only include letters, numbers, spaces, and commas.' })
    }

    const data = {
      ...req.body,
      uploaderId: req.user._id,
      uploader:   req.user.name,
    }
    if (req.file) data.filePath = `/uploads/${req.file.filename}`
    const resource = new Resource(data)
    await resource.save()
    res.status(201).json(resource)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

// ── DELETE /api/resources/:id  — owner or admin only ─────────────────────────
exports.deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id)
    if (!resource) return res.status(404).json({ message: 'Resource not found' })

    const isOwner = resource.uploaderId?.toString() === req.user._id.toString()
    const isAdmin = req.user.role === 'admin'
    if (!isOwner && !isAdmin)
      return res.status(403).json({ message: 'Not authorized to delete this resource' })

    await resource.deleteOne()
    res.json({ message: 'Resource removed' })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

// ── PATCH /api/resources/:id/report  — report with optional reason ────────────
exports.reportResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id)
    if (!resource) return res.status(404).json({ message: 'Resource not found' })

    // One report per user
    const alreadyReported = resource.reports.some(
      r => r.reportedBy?.toString() === req.user._id.toString()
    )
    if (alreadyReported)
      return res.status(400).json({ message: 'You have already reported this resource' })

    resource.reports.push({
      reportedBy: req.user._id,
      reason:     req.body.reason || '',
    })
    resource.reported = true
    await resource.save()

    // Check auto-block
    await maybeBlock(resource)

    res.json(resource)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

// ── GET /api/resources/my-count  — count of resources uploaded by current user ─
exports.getMyCount = async (req, res) => {
  try {
    console.log('getMyCount called for user', req.user?._id)
    const count = await Resource.countDocuments({ uploaderId: req.user._id })
    res.json({ count })
  } catch (err) {
    console.error('getMyCount error', err)
    res.status(500).json({ message: 'Server error', detail: err.message })
  }
}

// ── GET /api/resources/my-reported  — uploader's own reported resources ──────
exports.getMyReported = async (req, res) => {
  try {
    const resources = await Resource.find({
      uploaderId: req.user._id,
      'reports.0': { $exists: true },   // array has at least one entry
    }).sort({ createdAt: -1 })

    res.json(resources)
  } catch (err) {
    res.status(500).json({ message: 'Server error', detail: err.message })
  }
}

// ── PATCH /api/resources/:id/like  — toggle like ──────────────────────────────
exports.likeResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id)
    if (!resource) return res.status(404).json({ message: 'Resource not found' })

    const uid       = req.user._id.toString()
    const likedIdx  = resource.likes.findIndex(id => id.toString() === uid)
    const dislikedIdx = resource.dislikes.findIndex(id => id.toString() === uid)

    if (likedIdx !== -1) {
      // Toggle off
      resource.likes.splice(likedIdx, 1)
    } else {
      resource.likes.push(req.user._id)
      // Remove dislike if present
      if (dislikedIdx !== -1) resource.dislikes.splice(dislikedIdx, 1)
    }

    await resource.save()
    await maybeBlock(resource)
    res.json(resource)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

// ── PATCH /api/resources/:id/dislike  — toggle dislike ────────────────────────
exports.dislikeResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id)
    if (!resource) return res.status(404).json({ message: 'Resource not found' })

    const uid         = req.user._id.toString()
    const dislikedIdx = resource.dislikes.findIndex(id => id.toString() === uid)
    const likedIdx    = resource.likes.findIndex(id => id.toString() === uid)

    if (dislikedIdx !== -1) {
      resource.dislikes.splice(dislikedIdx, 1)
    } else {
      resource.dislikes.push(req.user._id)
      if (likedIdx !== -1) resource.likes.splice(likedIdx, 1)
    }

    await resource.save()
    await maybeBlock(resource)
    res.json(resource)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}
