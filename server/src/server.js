require('dotenv').config()
const { createServer } = require('http')
const { Server } = require('socket.io')
const app = require('./app')
const prisma = require('./config/db')

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/splitora'
  console.warn('⚠️ DATABASE_URL missing. Falling back to local Postgres default.')
}

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'dev_jwt_secret_change_me'
  console.warn('⚠️ JWT_SECRET missing. Using development fallback secret.')
}

if (!process.env.JWT_REFRESH_SECRET) {
  process.env.JWT_REFRESH_SECRET = 'dev_jwt_refresh_secret_change_me'
  console.warn('⚠️ JWT_REFRESH_SECRET missing. Using development fallback secret.')
}

const PORT = parseInt(process.env.PORT, 10) || 10000

const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling']
})

global.io = io

io.on('connection', (socket) => {
  socket.on('join-group', (groupId) => socket.join(`group-${groupId}`))
  socket.on('leave-group', (groupId) => socket.leave(`group-${groupId}`))
})

async function startServer() {
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`)
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`)
  })

  const connectWithRetry = async () => {
    try {
      await prisma.$connect()
      console.log('✅ Database connected')
    } catch (error) {
      console.error('⚠️ Database not reachable yet:', error.message)
      console.log('↻ Retrying database connection in 5 seconds...')
      setTimeout(connectWithRetry, 5000)
    }
  }

  await connectWithRetry()
}

startServer()

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err.message)
  process.exit(1)
})

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err.message)
  process.exit(1)
})
