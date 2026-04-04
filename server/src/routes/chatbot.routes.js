const express = require('express')
const { protect } = require('../middleware/auth.middleware')
const { chat } = require('../controllers/chatbot.controller')

const router = express.Router()

router.post('/chat', protect, chat)

module.exports = router
