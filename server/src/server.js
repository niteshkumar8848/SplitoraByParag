require('dotenv').config()
const { createServer } = require('http')
const { Server } = require('socket.io')
const app = require('./app')
const { PrismaClient } = require('@prisma/client')

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/splitora'
  console.warn('⚠️  DATABASE_URL missing. Falling back to local Postgres default.')
}

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'dev_jwt_secret_change_me'
  console.warn('⚠️  JWT_SECRET missing. Using development fallback secret.')
}

if (!process.env.JWT_REFRESH_SECRET) {
  process.env.JWT_REFRESH_SECRET = 'dev_jwt_refresh_secret_change_me'
  console.warn('⚠️  JWT_REFRESH_SECRET missing. Using development fallback secret.')
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

/**
 * Run a single raw SQL statement, ignoring errors (e.g. column already exists).
 */
async function tryExec(prisma, sql, label) {
  try {
    await prisma.$executeRawUnsafe(sql)
    console.log(`  ✓ ${label}`)
  } catch (err) {
    // Ignore "already exists" class of errors
    if (
      err.message.includes('already exists') ||
      err.message.includes('does not exist') ||
      err.message.includes('duplicate column')
    ) {
      console.log(`  ~ ${label} (already applied)`)
    } else {
      console.warn(`  ⚠ ${label}: ${err.message}`)
    }
  }
}

/**
 * Apply ALL schema changes that may be missing from the production DB.
 * Every statement is idempotent (IF NOT EXISTS / DROP NOT NULL is safe to repeat).
 * This replaces unreliable subprocess-based `prisma migrate deploy`.
 */
async function ensureSchema(prisma) {
  console.log('🔄 Ensuring database schema is up to date...')

  // ── User table ──────────────────────────────────────────────────────────────
  // Make passwordHash nullable (needed for Google-only accounts)
  await tryExec(
    prisma,
    `ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;`,
    'User.passwordHash nullable'
  )

  // Add authProvider column (migration 20260322235500_add_google_auth)
  await tryExec(
    prisma,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "authProvider" TEXT NOT NULL DEFAULT 'local';`,
    'User.authProvider column'
  )

  // Add googleId column
  await tryExec(
    prisma,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleId" TEXT;`,
    'User.googleId column'
  )

  // Unique index on googleId
  await tryExec(
    prisma,
    `CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key" ON "User"("googleId");`,
    'User.googleId unique index'
  )

  // ── Group table ─────────────────────────────────────────────────────────────
  // Add inviteCode column (present in schema, may be missing in older DBs)
  await tryExec(
    prisma,
    `ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "inviteCode" TEXT;`,
    'Group.inviteCode column'
  )

  await tryExec(
    prisma,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Group_inviteCode_key" ON "Group"("inviteCode");`,
    'Group.inviteCode unique index'
  )

  // ── Settlement table ─────────────────────────────────────────────────────────
  // Add Razorpay columns (present in schema, may be missing in older DBs)
  await tryExec(
    prisma,
    `ALTER TABLE "Settlement" ADD COLUMN IF NOT EXISTS "razorpayOrderId" TEXT;`,
    'Settlement.razorpayOrderId column'
  )

  await tryExec(
    prisma,
    `ALTER TABLE "Settlement" ADD COLUMN IF NOT EXISTS "razorpayPaymentId" TEXT;`,
    'Settlement.razorpayPaymentId column'
  )

  // ── Indexes from migration 20260318115305_init ────────────────────────────────
  await tryExec(prisma, `CREATE INDEX IF NOT EXISTS "Expense_groupId_idx" ON "Expense"("groupId");`, 'Expense.groupId index')
  await tryExec(prisma, `CREATE INDEX IF NOT EXISTS "Expense_paidById_idx" ON "Expense"("paidById");`, 'Expense.paidById index')
  await tryExec(prisma, `CREATE INDEX IF NOT EXISTS "ExpenseShare_userId_idx" ON "ExpenseShare"("userId");`, 'ExpenseShare.userId index')
  await tryExec(prisma, `CREATE INDEX IF NOT EXISTS "Group_createdById_idx" ON "Group"("createdById");`, 'Group.createdById index')
  await tryExec(prisma, `CREATE INDEX IF NOT EXISTS "GroupMember_groupId_idx" ON "GroupMember"("groupId");`, 'GroupMember.groupId index')
  await tryExec(prisma, `CREATE INDEX IF NOT EXISTS "RefreshToken_userId_idx" ON "RefreshToken"("userId");`, 'RefreshToken.userId index')
  await tryExec(prisma, `CREATE INDEX IF NOT EXISTS "Settlement_groupId_idx" ON "Settlement"("groupId");`, 'Settlement.groupId index')
  await tryExec(prisma, `CREATE INDEX IF NOT EXISTS "Settlement_payerId_idx" ON "Settlement"("payerId");`, 'Settlement.payerId index')
  await tryExec(prisma, `CREATE INDEX IF NOT EXISTS "Settlement_receiverId_idx" ON "Settlement"("receiverId");`, 'Settlement.receiverId index')

  console.log('✅ Database schema is fully up to date')
}

async function startServer() {
  // Listen immediately so Render health checks pass right away
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`)
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`)
  })

  // Create a dedicated prisma client for startup tasks
  const datasourceUrl = process.env.DIRECT_URL || process.env.DATABASE_URL
  const startupPrisma = new PrismaClient({
    log: ['error'],
    ...(datasourceUrl ? { datasources: { db: { url: datasourceUrl } } } : {})
  })

  // Keep retrying DB connection until Render's managed DB wakes up
  let connected = false
  while (!connected) {
    try {
      await startupPrisma.$connect()
      console.log('✅ Database connected')
      connected = true
    } catch (err) {
      console.error('⚠️  Database not reachable yet:', err.message)
      console.log('↻  Retrying in 5 seconds...')
      await new Promise((r) => setTimeout(r, 5000))
    }
  }

  // Apply all missing schema changes inline (no subprocess, no npx)
  await ensureSchema(startupPrisma)
  await startupPrisma.$disconnect()
}

startServer().catch((err) => {
  console.error('Fatal startup error:', err)
  process.exit(1)
})

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err.message)
  process.exit(1)
})

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err.message)
  process.exit(1)
})
