const express = require('express')
const router = express.Router()
const {
  getActivities, getSummary, createActivity, deleteActivity
} = require('../controllers/activityController')

router.get('/summary',  getSummary)       // ← must be BEFORE /:id routes
router.get('/',         getActivities)
router.post('/',        createActivity)
router.delete('/:id',   deleteActivity)

module.exports = router
