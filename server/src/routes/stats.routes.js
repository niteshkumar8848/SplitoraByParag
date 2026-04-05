const express = require('express')
const { protect } = require('../middleware/auth.middleware')
const { getDashboardStats, getMyTransactions } = require('../controllers/stats.controller')
const router = express.Router()

router.get('/dashboard', protect, getDashboardStats)
router.get('/transactions', protect, getMyTransactions)

module.exports = router
