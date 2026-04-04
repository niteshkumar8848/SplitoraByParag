const express = require('express')
const helmet = require('helmet')
const morgan = require('morgan')
const cookieParser = require('cookie-parser')

const app = express()
app.set('trust proxy', 1)

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

app.use(helmet({ crossOriginResourcePolicy: false }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'))

app.use('/api/auth', require('./routes/auth.routes'))
app.use('/api/groups', require('./routes/group.routes'))
app.use('/api/expenses', require('./routes/expense.routes'))
app.use('/api/settlements', require('./routes/settlement.routes'))
app.use('/api/payments', require('./routes/payment.routes'))
app.use('/api/ai', require('./routes/ai.routes'))
app.use('/api/chatbot', require('./routes/chatbot.routes'))
app.use('/api/stats', require('./routes/stats.routes'))

app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date(), uptime: process.uptime() }))

app.use(require('./middleware/error.middleware'))

module.exports = app
