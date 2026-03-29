const express = require('express')
const router  = express.Router()
const { getNotifications, markAllRead, markOneRead } = require('../controllers/notificationController')

router.get('/',               getNotifications)
router.patch('/mark-read',    markAllRead)
router.patch('/:id/read',     markOneRead)

module.exports = router
