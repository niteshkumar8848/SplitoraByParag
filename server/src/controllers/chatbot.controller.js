const Anthropic = require('@anthropic-ai/sdk')
const prisma = require('../config/db')
const ApiResponse = require('../utils/apiResponse')

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are Splitora Assistant, a helpful AI built into the Splitora expense splitting app. You have full access to the user's data and can help them manage their groups, expenses, and settlements.

You can help users with:
1. VIEWING DATA: Show their groups, expenses, balances, settlements
2. CREATING: Create new groups, add expenses
3. ANALYZING: Analyze spending patterns, calculate who owes what, suggest fair splits
4. SETTLING: Help calculate minimum settlement transactions, explain who should pay whom
5. ANSWERING QUESTIONS: Explain how splits work, what balances mean, how to use the app

When you need to perform an action or fetch data, respond with a special JSON action block like this:
<action>{"type": "ACTION_TYPE", "params": {}}</action>

Available actions:
- <action>{"type": "GET_GROUPS"}</action> - fetch all user groups
- <action>{"type": "GET_GROUP_DETAIL", "params": {"groupId": "id"}}</action> - fetch group with expenses and balances
- <action>{"type": "GET_EXPENSES", "params": {"groupId": "id"}}</action> - fetch group expenses
- <action>{"type": "GET_SETTLEMENTS", "params": {"groupId": "id"}}</action> - fetch settlement suggestions
- <action>{"type": "CREATE_GROUP", "params": {"name": "string", "description": "string", "category": "string"}}</action> - create a new group
- <action>{"type": "ADD_EXPENSE", "params": {"groupId": "id", "title": "string", "amount": 500, "paidById": "userId", "memberIds": ["userId1", "userId2"]}}</action> - add expense with equal split
- <action>{"type": "GET_DASHBOARD_STATS"}</action> - fetch dashboard statistics

Rules:
- Always be friendly and concise
- When showing money amounts always use Indian Rupee format ₹X,XXX
- When you perform an action, the system will execute it and return data to you
- After receiving action results, interpret them in a human-friendly way
- If a user asks to create something, confirm the details before doing it
- Never make up data — only show real data from actions
- If you cannot do something, tell the user clearly
- Keep responses short and clear — use bullet points and emojis where helpful
- You are only for Splitora — politely decline unrelated requests
- Do NOT include the raw <action> tags in your final response to the user`

const executeAction = async (action, userId) => {
  const { type, params = {} } = action

  switch (type) {
    case 'GET_GROUPS': {
      const groups = await prisma.group.findMany({
        where: { members: { some: { userId } } },
        include: {
          _count: { select: { members: true, expenses: true } },
          expenses: { select: { amount: true } }
        },
        orderBy: { updatedAt: 'desc' }
      })
      return groups.map((g) => ({
        id: g.id,
        name: g.name,
        category: g.category,
        memberCount: g._count.members,
        expenseCount: g._count.expenses,
        totalAmount: g.expenses.reduce((s, e) => s + e.amount, 0)
      }))
    }

    case 'GET_GROUP_DETAIL': {
      const group = await prisma.group.findUnique({
        where: { id: params.groupId },
        include: {
          members: {
            include: { user: { select: { id: true, name: true, email: true } } }
          },
          expenses: {
            include: {
              paidBy: { select: { id: true, name: true } },
              shares: { include: { user: { select: { id: true, name: true } } } }
            },
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      })
      if (!group) return { error: 'Group not found' }
      const membership = group.members.find((m) => m.userId === userId)
      if (!membership) return { error: 'Access denied' }

      const balancesMap = {}
      group.members.forEach((m) => {
        balancesMap[m.userId] = { name: m.user.name, paid: 0, owed: 0 }
      })
      group.expenses.forEach((e) => {
        if (balancesMap[e.paidById]) balancesMap[e.paidById].paid += e.amount
        e.shares.forEach((s) => {
          if (balancesMap[s.userId]) balancesMap[s.userId].owed += s.amount
        })
      })
      const balances = Object.entries(balancesMap).map(([uid, b]) => ({
        userId: uid,
        name: b.name,
        balance: Number((b.paid - b.owed).toFixed(2))
      }))

      return {
        group: { id: group.id, name: group.name, category: group.category },
        members: group.members.map((m) => ({
          id: m.userId,
          name: m.user.name,
          role: m.role
        })),
        recentExpenses: group.expenses.slice(0, 5).map((e) => ({
          id: e.id,
          title: e.title,
          amount: e.amount,
          paidBy: e.paidBy.name,
          splitType: e.splitType
        })),
        balances
      }
    }

    case 'GET_EXPENSES': {
      const membership = await prisma.groupMember.findUnique({
        where: { userId_groupId: { userId, groupId: params.groupId } }
      })
      if (!membership) return { error: 'Access denied' }

      const expenses = await prisma.expense.findMany({
        where: { groupId: params.groupId },
        include: { paidBy: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20
      })
      return expenses.map((e) => ({
        id: e.id,
        title: e.title,
        amount: e.amount,
        paidBy: e.paidBy.name,
        category: e.category,
        splitType: e.splitType,
        date: e.date
      }))
    }

    case 'GET_SETTLEMENTS': {
      const { calculateBalances, simplifyDebts } = require('../services/settlement.service')
      const balances = await calculateBalances(params.groupId)
      const suggestions = simplifyDebts(balances)
      const userIds = [...new Set(suggestions.flatMap((s) => [s.from, s.to]))]
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true }
      })
      const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]))
      return suggestions.map((s) => ({
        from: userMap[s.from] || s.from,
        to: userMap[s.to] || s.to,
        amount: s.amount
      }))
    }

    case 'CREATE_GROUP': {
      const group = await prisma.group.create({
        data: {
          name: params.name,
          description: params.description || null,
          category: params.category || 'general',
          createdById: userId,
          members: { create: { userId, role: 'admin' } }
        }
      })
      return {
        success: true,
        group: { id: group.id, name: group.name, category: group.category }
      }
    }

    case 'ADD_EXPENSE': {
      const membership = await prisma.groupMember.findUnique({
        where: { userId_groupId: { userId, groupId: params.groupId } }
      })
      if (!membership) return { error: 'Access denied' }

      const memberIds = params.memberIds && params.memberIds.length > 0
        ? params.memberIds
        : [userId]
      const amount = Number(params.amount)
      const share = Number((amount / memberIds.length).toFixed(2))

      const expense = await prisma.$transaction(async (tx) => {
        const exp = await tx.expense.create({
          data: {
            groupId: params.groupId,
            title: params.title,
            amount,
            splitType: 'equal',
            category: params.category || 'general',
            paidById: params.paidById || userId,
            date: new Date()
          }
        })
        await tx.expenseShare.createMany({
          data: memberIds.map((uid, i) => ({
            expenseId: exp.id,
            userId: uid,
            amount:
              i === memberIds.length - 1
                ? Number((amount - share * (memberIds.length - 1)).toFixed(2))
                : share
          }))
        })
        return exp
      })
      return {
        success: true,
        expense: { id: expense.id, title: expense.title, amount: expense.amount }
      }
    }

    case 'GET_DASHBOARD_STATS': {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const groups = await prisma.group.findMany({
        where: { members: { some: { userId } } },
        include: { expenses: { select: { amount: true, date: true } } }
      })
      const totalExpensesThisMonth = groups
        .flatMap((g) => g.expenses)
        .filter((e) => new Date(e.date) >= startOfMonth)
        .reduce((s, e) => s + e.amount, 0)
      return {
        totalGroups: groups.length,
        totalExpensesThisMonth: Number(totalExpensesThisMonth.toFixed(2)),
        message: `You have ${groups.length} group(s) and spent ₹${totalExpensesThisMonth.toFixed(2)} this month`
      }
    }

    default:
      return { error: `Unknown action: ${type}` }
  }
}

const parseActions = (text) => {
  const actionRegex = /<action>([\s\S]*?)<\/action>/g
  const actions = []
  let match
  while ((match = actionRegex.exec(text)) !== null) {
    try {
      actions.push(JSON.parse(match[1].trim()))
    } catch (_e) {
      // skip malformed action blocks
    }
  }
  return actions
}

const chat = async (req, res, next) => {
  try {
    const userId = req.user && req.user.userId
    if (!userId) return ApiResponse.error(res, 'Unauthorized', 401)

    const { messages, message } = req.body
    if (!message && (!messages || !messages.length)) {
      return ApiResponse.error(res, 'Message is required', 400)
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return ApiResponse.error(res, 'AI service is not configured', 503)
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true }
    })
    if (!user) return ApiResponse.error(res, 'User not found', 404)

    const conversationHistory = Array.isArray(messages) ? messages : []
    const userMessage = message || (conversationHistory[conversationHistory.length - 1]?.content ?? '')

    const systemWithContext = `${SYSTEM_PROMPT}

Current user context:
- Name: ${user.name}
- Email: ${user.email}
- User ID: ${user.id}
- Current time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`

    // Keep only last 10 turns to stay within token limits
    const apiMessages = [
      ...conversationHistory.slice(-10),
      { role: 'user', content: userMessage }
    ]

    // First call — AI decides if it needs to perform an action
    const initialResponse = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemWithContext,
      messages: apiMessages
    })

    let responseText = initialResponse.content[0].text
    const actions = parseActions(responseText)

    if (actions.length > 0) {
      // Execute all actions
      const actionResults = []
      for (const action of actions) {
        const result = await executeAction(action, userId)
        actionResults.push({ action: action.type, result })
      }

      // Second call — AI interprets the action results into a friendly response
      const followUpMessages = [
        ...apiMessages,
        { role: 'assistant', content: responseText },
        {
          role: 'user',
          content: `Action results:\n${JSON.stringify(actionResults, null, 2)}\n\nPlease provide a helpful, human-readable response based on this data. Do NOT show raw JSON or <action> tags. Use emojis, bullet points and ₹ for amounts.`
        }
      ]

      const finalResponse = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemWithContext,
        messages: followUpMessages
      })

      responseText = finalResponse.content[0].text
    }

    // Strip any leftover action tags from the final response
    const cleanResponse = responseText.replace(/<action>[\s\S]*?<\/action>/g, '').trim()

    return ApiResponse.success(
      res,
      { message: cleanResponse, role: 'assistant' },
      'Chat response generated'
    )
  } catch (err) {
    return next(err)
  }
}

module.exports = { chat }
