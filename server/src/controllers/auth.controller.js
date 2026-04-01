const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const prisma = require('../config/db')
const ApiResponse = require('../utils/apiResponse')

const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'
const REFRESH_TOKEN_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000

const createAccessToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN })

const createRefreshToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN })

const issueTokens = async (userId) => {
  const accessToken = createAccessToken(userId)
  const refreshToken = createRefreshToken(userId)

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS)
    }
  })

  return { accessToken, refreshToken }
}

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
})

const isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(email)

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body
    const normalizedName = String(name || '').trim()
    const normalizedEmail = String(email || '').trim().toLowerCase()

    if (!normalizedName || !normalizedEmail || !password) {
      return ApiResponse.error(res, 'Name, email, and password are required', 400)
    }

    if (String(password).length < 6) {
      return ApiResponse.error(res, 'Password must be at least 6 characters', 400)
    }

    if (!isValidEmail(normalizedEmail)) {
      return ApiResponse.error(res, 'Please provide a valid email address', 400)
    }

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } })
    if (existingUser) {
      return ApiResponse.error(res, 'Email is already registered', 400)
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { name: normalizedName, email: normalizedEmail, passwordHash }
    })

    const { accessToken, refreshToken } = await issueTokens(user.id)

    return ApiResponse.success(
      res,
      { user: sanitizeUser(user), accessToken, refreshToken },
      'User registered successfully',
      201
    )
  } catch (error) {
    if (error?.code === 'P2002') return ApiResponse.error(res, 'Email is already registered', 400)
    return next(error)
  }
}

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body
    const normalizedEmail = String(email || '').trim().toLowerCase()

    if (!normalizedEmail || !password) {
      return ApiResponse.error(res, 'Email and password are required', 400)
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        passwordHash: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!user) {
      return ApiResponse.error(res, 'Invalid email or password', 401)
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
    if (!isPasswordValid) {
      return ApiResponse.error(res, 'Invalid email or password', 401)
    }

    const { accessToken, refreshToken } = await issueTokens(user.id)

    return ApiResponse.success(
      res,
      { user: sanitizeUser(user), accessToken, refreshToken },
      'Login successful'
    )
  } catch (error) {
    return next(error)
  }
}

const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body

    if (!token) {
      return ApiResponse.error(res, 'Refresh token is required', 401)
    }

    const storedToken = await prisma.refreshToken.findUnique({ where: { token } })
    if (!storedToken || storedToken.expiresAt < new Date()) {
      return ApiResponse.error(res, 'Invalid or expired refresh token', 401)
    }

    try {
      jwt.verify(token, process.env.JWT_REFRESH_SECRET)
    } catch (_error) {
      return ApiResponse.error(res, 'Invalid or expired refresh token', 401)
    }

    const newAccessToken = createAccessToken(storedToken.userId)
    return ApiResponse.success(res, { accessToken: newAccessToken }, 'Access token refreshed')
  } catch (error) {
    return next(error)
  }
}

const logout = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body
    if (!token) return ApiResponse.error(res, 'Refresh token is required', 400)

    await prisma.refreshToken.deleteMany({ where: { token } })
    return ApiResponse.success(res, null, 'Logged out successfully')
  } catch (error) {
    return next(error)
  }
}

const getMe = async (req, res, next) => {
  try {
    const userId = req.user && req.user.userId
    if (!userId) return ApiResponse.error(res, 'Unauthorized', 401)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!user) return ApiResponse.error(res, 'User not found', 404)
    return ApiResponse.success(res, { user }, 'User fetched successfully')
  } catch (error) {
    return next(error)
  }
}

const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user && req.user.userId
    if (!userId) return ApiResponse.error(res, 'Unauthorized', 401)

    const { name, avatar } = req.body
    const data = {}
    if (name !== undefined) data.name = String(name).trim()
    if (avatar !== undefined) data.avatar = avatar

    if (!Object.keys(data).length) return ApiResponse.error(res, 'Nothing to update', 400)

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return ApiResponse.success(res, { user }, 'Profile updated successfully')
  } catch (error) {
    return next(error)
  }
}

const changePassword = async (req, res, next) => {
  try {
    const userId = req.user && req.user.userId
    if (!userId) return ApiResponse.error(res, 'Unauthorized', 401)

    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) {
      return ApiResponse.error(res, 'Current and new password are required', 400)
    }

    if (newPassword.length < 6) {
      return ApiResponse.error(res, 'New password must be at least 6 characters', 400)
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true }
    })

    if (!user) return ApiResponse.error(res, 'User not found', 404)

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isValid) return ApiResponse.error(res, 'Current password is incorrect', 400)

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } })

    return ApiResponse.success(res, null, 'Password changed successfully')
  } catch (error) {
    return next(error)
  }
}

const uploadAvatar = async (req, res, next) => {
  try {
    const userId = req.user && req.user.userId
    if (!userId) return ApiResponse.error(res, 'Unauthorized', 401)
    if (!req.file) return ApiResponse.error(res, 'No file uploaded', 400)
    let avatarUrl = null

    const hasCloudinaryConfig = Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    )

    if (hasCloudinaryConfig) {
      const cloudinary = require('../config/cloudinary')
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'splitora/avatars',
            public_id: `avatar_${userId}`,
            overwrite: true,
            transformation: [
              { width: 400, height: 400, crop: 'fill', gravity: 'face' },
              { quality: 'auto', fetch_format: 'auto' }
            ]
          },
          (error, uploaded) => {
            if (error) reject(error)
            else resolve(uploaded)
          }
        )
        stream.end(req.file.buffer)
      })
      avatarUrl = result.secure_url
    } else {
      const mimeType = req.file.mimetype || 'image/jpeg'
      const base64 = req.file.buffer.toString('base64')
      avatarUrl = `data:${mimeType};base64,${base64}`
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return ApiResponse.success(res, { user, avatarUrl }, 'Avatar uploaded successfully')
  } catch (error) {
    return next(error)
  }
}

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  updateProfile,
  changePassword,
  uploadAvatar
}
