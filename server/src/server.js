require('dotenv').config()
const app = require('./app')
const prisma = require('./config/db')

const PORT = parseInt(process.env.PORT) || 10000

async function startServer() {
  try {
    await prisma.$connect()
    console.log('Database connected successfully')
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`)
      console.log(`Environment: ${process.env.NODE_ENV}`)
    })
  } catch (error) {
    console.error('Server failed to start:', error.message)
    process.exit(1)
  }
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
