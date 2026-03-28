const express = require('express')
const router = express.Router()
const multer = require('multer')
const {
  getResources, createResource, reportResource, deleteResource
} = require('../controllers/resourceController')

// Multer — save PDFs to /uploads with a unique timestamped filename
const fs = require('fs');
if (!fs.existsSync('uploads/')) {
  fs.mkdirSync('uploads/');
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
})
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true)
    else cb(new Error('Only PDF files are allowed'))
  }
})

router.get('/', getResources)
router.post('/', upload.single('file'), createResource)  // 'file' matches formData.append('file', ...)
router.patch('/:id/report', reportResource)
router.delete('/:id', deleteResource)

module.exports = router
