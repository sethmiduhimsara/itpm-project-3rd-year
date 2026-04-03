const express = require('express')
const router  = express.Router()
const multer  = require('multer')
console.log('resources route module loaded:', __filename)
const {
  getResources,
  getMyCount,
  getMyReported,
  createResource,
  deleteResource,
  reportResource,
  likeResource,
  dislikeResource,
} = require('../controllers/resourceController')

// Multer — save PDFs to /uploads with a unique timestamped filename
const fs = require('fs')
if (!fs.existsSync('uploads/')) fs.mkdirSync('uploads/')

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
})
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true)
    else cb(new Error('Only PDF files are allowed'))
  }
})

router.get('/',                  getResources)
router.get('/my-count',          getMyCount)
router.get('/my-reported',       getMyReported)
router.get('/health',            (req, res) => res.json({ ok: true, path: '/api/resources/health' }))
router.post('/',                 upload.single('file'), createResource)
router.delete('/:id',            deleteResource)
router.patch('/:id/report',      reportResource)
router.patch('/:id/like',        likeResource)
router.patch('/:id/dislike',     dislikeResource)

module.exports = router
