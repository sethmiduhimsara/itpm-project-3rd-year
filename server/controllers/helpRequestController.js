const HelpRequest = require('../models/HelpRequest')

// GET /api/help-requests  — get all, optional ?status=Open
exports.getHelpRequests = async (req, res) => {
  try {
    const filter = {}
    if (req.query.status && req.query.status !== 'All') filter.status = req.query.status
    const requests = await HelpRequest.find(filter).sort({ createdAt: -1 })
    res.json(requests)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
}

// POST /api/help-requests  — create new request
exports.createHelpRequest = async (req, res) => {
  try {
    const helpReq = new HelpRequest(req.body)
    await helpReq.save()
    res.status(201).json(helpReq)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

// PATCH /api/help-requests/:id/accept  — accept (Open → In Progress)
exports.acceptRequest = async (req, res) => {
  try {
    const helpReq = await HelpRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'In Progress', acceptedBy: req.body.acceptedBy },
      { new: true }
    )
    res.json(helpReq)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

// POST /api/help-requests/:id/responses  — add a response
exports.addResponse = async (req, res) => {
  try {
    const helpReq = await HelpRequest.findById(req.params.id)
    if (!helpReq) return res.status(404).json({ message: 'Request not found' })
    helpReq.responses.push({ text: req.body.text, helper: req.body.helper })
    if (helpReq.status === 'Open') {
      helpReq.status = 'In Progress'
      helpReq.acceptedBy = req.body.helper
    }
    await helpReq.save()
    res.json(helpReq)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

// PATCH /api/help-requests/:id/close  — close (In Progress → Closed)
exports.closeRequest = async (req, res) => {
  try {
    const helpReq = await HelpRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'Closed' },
      { new: true }
    )
    res.json(helpReq)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

// DELETE /api/help-requests/:id
exports.deleteHelpRequest = async (req, res) => {
  try {
    await HelpRequest.findByIdAndDelete(req.params.id)
    res.json({ message: 'Request deleted' })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}
