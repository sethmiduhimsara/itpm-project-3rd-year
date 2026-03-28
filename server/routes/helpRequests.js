const express = require('express')
const router = express.Router()
const multer = require('multer')
const {
  getHelpRequests, createHelpRequest, acceptRequest,
  addMessage, closeRequest, deleteHelpRequest,
  getHelpRequestById, updateHelpRequest
} = require('../controllers/helpRequestController')

// Multer — help request attachments
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
})
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf']
    if (allowed.includes(file.mimetype)) cb(null, true)
    else cb(new Error('Only JPEG, PNG, or PDF files are allowed'), false)
  }
})

router.get('/',                  getHelpRequests)
router.post('/',                 upload.single('file'), createHelpRequest)
router.get('/:id',               getHelpRequestById)
router.patch('/:id',             upload.single('file'), updateHelpRequest)
router.patch('/:id/accept',      acceptRequest)
router.post('/:id/messages',     addMessage)
router.patch('/:id/close',       closeRequest)
router.delete('/:id',            deleteHelpRequest)

module.exports = router
