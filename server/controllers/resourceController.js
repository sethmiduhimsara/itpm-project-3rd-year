const Resource = require('../models/Resource')

// GET /api/resources  — get all, optional ?subject=&semester=
exports.getResources = async (req, res) => {
  try {
    const filter = {}
    if (req.query.subject  && req.query.subject  !== 'All') filter.subject  = req.query.subject
    if (req.query.semester && req.query.semester !== 'All') filter.semester = req.query.semester
    const resources = await Resource.find(filter).sort({ createdAt: -1 })
    res.json(resources)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
}

// POST /api/resources  — upload new resource
exports.createResource = async (req, res) => {
  try {
    const data = { ...req.body }
    if (req.file) data.filePath = `/uploads/${req.file.filename}`
    const resource = new Resource(data)
    await resource.save()
    res.status(201).json(resource)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

// PATCH /api/resources/:id/report  — mark as reported
exports.reportResource = async (req, res) => {
  try {
    const resource = await Resource.findByIdAndUpdate(
      req.params.id,
      { reported: true },
      { new: true }
    )
    res.json(resource)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

// DELETE /api/resources/:id  — remove resource
exports.deleteResource = async (req, res) => {
  try {
    await Resource.findByIdAndDelete(req.params.id)
    res.json({ message: 'Resource removed' })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}
