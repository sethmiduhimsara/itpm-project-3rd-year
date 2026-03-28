const HelpRequest = require('../models/HelpRequest')

// GET /api/help-requests  — get all, with optional ?status=Open, ?requester=Name, ?acceptedBy=Name
exports.getHelpRequests = async (req, res) => {
  try {
    const filter = {}
    if (req.query.status && req.query.status !== 'All') filter.status = req.query.status
    if (req.query.requester) filter.requester = req.query.requester
    if (req.query.acceptedByUserId) filter.acceptedByUserId = req.query.acceptedByUserId
    
    // Visibility Enforcement: Admin sees all. Others see Public requests OR their own.
    if (req.user.role !== 'admin') {
      filter.$or = [
        { visibility: 'Public' },
        { requester: req.user.name },
        { targetStudent: req.user.name },
        { acceptedByUserId: req.user._id }
      ]
    }

    let requests = await HelpRequest.find(filter).sort({ createdAt: -1 })

    // Privacy logic: Only requester, helper, or admin can see chat history (responses)
    if (req.user.role !== 'admin') {
      requests = requests.map(reqObj => {
        const isParticipant = (
          reqObj.requester === req.user.name || 
          reqObj.acceptedByUserId?.toString() === req.user._id.toString() ||
          reqObj.targetStudent === req.user.name
        )
        if (!isParticipant) {
          const plainReq = reqObj.toObject()
          delete plainReq.responses
          return plainReq
        }
        return reqObj
      })
    }
    res.json(requests)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
}

// POST /api/help-requests  — create new request
exports.createHelpRequest = async (req, res) => {
  try {
    const data = { ...req.body }
    if (req.file) {
      data.fileUrl = `/uploads/${req.file.filename}`
    }

    const helpReq = new HelpRequest(data)
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
      { 
        status: 'In Progress', 
        acceptedBy: req.body.acceptedBy,
        acceptedByUserId: req.user._id
      },
      { new: true }
    )
    res.json(helpReq)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

// POST /api/help-requests/:id/messages  — add a message to chat
exports.addMessage = async (req, res) => {
  try {
    const helpReq = await HelpRequest.findById(req.params.id)
    if (!helpReq) return res.status(404).json({ message: 'Request not found' })

    const sender = req.user.name
    let role = 'Helper'
    if (sender === helpReq.requester) role = 'Requester'

    // Authorization: Requester, Target Student, assigned Helper, or Admin
    const isParticipant = (
      sender === helpReq.requester ||
      sender === helpReq.targetStudent ||
      sender === helpReq.acceptedBy ||
      req.user.role === 'admin'
    )
    if (!isParticipant) return res.status(403).json({ message: 'Not authorized to message here' })

    helpReq.responses.push({
      text: req.body.text,
      sender: sender,
      role: role
    })

    // Auto-accept if Open and a helper responded
    if (helpReq.status === 'Open' && role === 'Helper') {
      helpReq.status = 'In Progress'
      helpReq.acceptedBy = sender
      helpReq.acceptedByUserId = req.user._id
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

// GET /api/help-requests/:id
exports.getHelpRequestById = async (req, res) => {
  try {
    const helpReq = await HelpRequest.findById(req.params.id)
    if (!helpReq) return res.status(404).json({ message: 'Request not found' })

    const isParticipant = (
      helpReq.requester === req.user.name ||
      helpReq.acceptedByUserId?.toString() === req.user._id.toString() ||
      helpReq.targetStudent === req.user.name ||
      req.user.role === 'admin'
    )

    // Unauthorized access to Private request
    if (helpReq.visibility === 'Private' && !isParticipant) {
      return res.status(403).json({ message: 'Not authorized to view this private request' })
    }

    // Public request but non-participant trying to peek at chat
    if (!isParticipant) {
       const plainReq = helpReq.toObject()
       delete plainReq.responses
       return res.json(plainReq)
    }

    res.json(helpReq)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

// PATCH /api/help-requests/:id
exports.updateHelpRequest = async (req, res) => {
  try {
    const helpReq = await HelpRequest.findById(req.params.id)
    if (!helpReq) return res.status(404).json({ message: 'Request not found' })

    // Check ownership
    if (req.user.role !== 'admin' && helpReq.requester !== req.user.name) {
      return res.status(403).json({ message: 'Not authorized to edit this request' })
    }

    const data = { ...req.body }
    if (req.file) {
      data.fileUrl = `/uploads/${req.file.filename}`
    }

    Object.assign(helpReq, data)
    await helpReq.save()
    res.json(helpReq)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}
