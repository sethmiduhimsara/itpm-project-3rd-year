const express = require('express')
const router = express.Router()
const { adminOnly } = require('../middleware/authMiddleware')
const {
  getPosts, createPost, addReply, updateStatus, deletePost
} = require('../controllers/postController')

router.get('/',                 getPosts)
router.post('/',                createPost)
router.post('/:id/replies',     addReply)
router.patch('/:id/status',     adminOnly, updateStatus)   // admin only
router.delete('/:id',           deletePost)

module.exports = router
