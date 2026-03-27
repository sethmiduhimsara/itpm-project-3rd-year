const express = require('express')
const router = express.Router()
const {
  getHelpRequests, createHelpRequest, acceptRequest,
  addResponse, closeRequest, deleteHelpRequest
} = require('../controllers/helpRequestController')

router.get('/',                  getHelpRequests)
router.post('/',                 createHelpRequest)
router.patch('/:id/accept',      acceptRequest)
router.post('/:id/responses',    addResponse)
router.patch('/:id/close',       closeRequest)
router.delete('/:id',            deleteHelpRequest)

module.exports = router
