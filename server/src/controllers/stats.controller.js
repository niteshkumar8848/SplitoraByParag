const prisma = require('../config/db')
const ApiResponse = require('../utils/apiResponse')
const { calculateBalances } = require('../services/settlement.service')

const getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user.userId
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const groups = await prisma.group.findMany({
      where: { members: { some: { userId } } },
      include: {
        _count: { select: { members: true } },
        expenses: { select: { amount: true, date: true }, orderBy: { createdAt: 'desc' } },
        members: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } }
      },
      orderBy: { updatedAt: 'desc' }
    })

    const totalExpensesThisMonth = groups
      .flatMap(g => g.expenses)
      .filter(e => new Date(e.date) >= startOfMonth)
      .reduce((s, e) => s + e.amount, 0)

    let totalYouOwe = 0
    let totalOwedToYou = 0

    for (const group of groups) {
      try {
        const balances = await calculateBalances(group.id)
        const userBalance = balances[userId] || 0
        if (userBalance < 0) totalYouOwe += Math.abs(userBalance)
        else totalOwedToYou += userBalance
      } catch {}
    }

    const recentExpenses = await prisma.expense.findMany({
      where: { group: { members: { some: { userId } } } },
      include: {
        paidBy: { select: { id: true, name: true, email: true, avatar: true } },
        group: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    return ApiResponse.success(res, {
      totalGroups: groups.length,
      totalExpensesThisMonth,
      totalYouOwe,
      totalOwedToYou,
      recentGroups: groups.slice(0, 3).map(g => ({
        id: g.id, name: g.name, category: g.category,
        memberCount: g._count.members, members: g.members,
        updatedAt: g.updatedAt, createdAt: g.createdAt
      })),
      recentExpenses
    }, 'Dashboard stats fetched')
  } catch (err) { return next(err) }
}

const getMyTransactions = async (req, res, next) => {
  try {
    const userId = req.user.userId

    const expenses = await prisma.expense.findMany({
      where: {
        OR: [
          { paidById: userId },
          { shares: { some: { userId } } }
        ]
      },
      include: {
        paidBy: { select: { id: true, name: true, email: true, avatar: true } },
        group: { select: { id: true, name: true } },
        shares: {
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          }
        }
      },
      orderBy: { date: 'desc' }
    })

    const settlements = await prisma.settlement.findMany({
      where: {
        OR: [
          { payerId: userId },
          { receiverId: userId }
        ]
      },
      include: {
        payer: { select: { id: true, name: true, avatar: true } },
        receiver: { select: { id: true, name: true, avatar: true } },
        group: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    const normalizedExpenses = expenses.map(e => ({
      id: e.id,
      eventType: 'expense',
      date: e.date,
      title: e.title,
      amount: e.amount,
      group: e.group,
      paidBy: e.paidBy,
      shares: e.shares,
      category: e.category,
      splitType: e.splitType
    }))

    const normalizedSettlements = settlements.map(s => ({
      id: s.id,
      eventType: 'settlement',
      date: s.createdAt,
      amount: s.amount,
      group: s.group,
      payer: s.payer,
      receiver: s.receiver,
      status: s.status
    }))

    const allTransactions = [...normalizedExpenses, ...normalizedSettlements].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    )

    return ApiResponse.success(res, { transactions: allTransactions }, 'Transactions fetched successfully')
  } catch (err) {
    return next(err)
  }
}

module.exports = { getDashboardStats, getMyTransactions }
