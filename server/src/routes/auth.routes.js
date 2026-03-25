const express = require('express')
const { body } = require('express-validator')
const { protect } = require('../middleware/auth.middleware')
const upload = require('../middleware/upload.middleware')
const validate = require('../middleware/validate.middleware')
const { register, login, googleSignIn, refreshToken, logout, getMe, updateProfile, changePassword, uploadAvatar } = require('../controllers/auth.controller')
const router = express.Router()

router.post('/register',
  [body('name').notEmpty().withMessage('Name is required'),
   body('email').isEmail().withMessage('Valid email is required'),
   body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')],
  validate, register)

router.post('/login',
  [body('email').isEmail().withMessage('Valid email is required'),
   body('password').notEmpty().withMessage('Password is required')],
  validate, login)

router.post('/google',
  [body('idToken').notEmpty().withMessage('Google ID token is required')],
  validate, googleSignIn)

router.post('/refresh', refreshToken)
router.post('/logout', logout)
router.get('/me', protect, getMe)
router.put('/profile', protect, updateProfile)
router.put('/password', protect, changePassword)
router.post('/avatar', protect, upload.single('avatar'), uploadAvatar)

module.exports = router
