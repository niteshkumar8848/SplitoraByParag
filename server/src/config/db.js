const { PrismaClient } = require('@prisma/client')
const globalForPrisma = global

const datasourceUrl = process.env.DIRECT_URL || process.env.DATABASE_URL

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  ...(datasourceUrl ? { datasources: { db: { url: datasourceUrl } } } : {})
})
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
module.exports = prisma
