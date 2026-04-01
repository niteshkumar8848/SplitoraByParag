import { useMemo, useState } from 'react'
import {
  ArrowDownUp,
  CalendarRange,
  ChevronDown,
  Download,
  Filter,
  HandCoins,
  Landmark,
  ListOrdered,
  ScrollText
} from 'lucide-react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Avatar from '../ui/Avatar'
import Button from '../ui/Button'
import Spinner from '../ui/Spinner'
import toast from 'react-hot-toast'
import { useGroupSettlements } from '../../hooks/useSettlements'

const formatCurrency = (v) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(v || 0)

const formatDate = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const formatDateShort = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

const relativeTime = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`
  const years = Math.floor(months / 12)
  return `${years} year${years > 1 ? 's' : ''} ago`
}

const CATEGORY_EMOJI = {
  food: '🍽️',
  travel: '✈️',
  home: '🏠',
  event: '🎉',
  entertainment: '🎬',
  shopping: '🛍️',
  general: '🧾'
}

const getMemberId = (m) => m.user?.id || m.userId || m.id
const getMemberName = (m) => m.user?.name || m.name || 'Member'
const getMemberEmail = (m) => m.user?.email || m.email || ''
const getMemberAvatar = (m) => m.user?.avatar || m.avatar || null

export default function GroupLedger({ expenses = [], members = [], balances = [], groupId, groupName = 'Group' }) {
  const [sortBy, setSortBy] = useState('date')
  const [sortOrder, setSortOrder] = useState('desc')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [exportingPDF, setExportingPDF] = useState(false)

  const { data: settlementsData, isLoading: isSettlementsLoading } = useGroupSettlements(groupId)

  const memberMap = useMemo(() => {
    const map = {}
    members.forEach((member) => {
      const id = getMemberId(member)
      map[id] = {
        id,
        name: getMemberName(member),
        email: getMemberEmail(member),
        avatar: getMemberAvatar(member),
        role: member.role || 'member'
      }
    })
    return map
  }, [members])

  const categories = useMemo(() => {
    const set = new Set(expenses.map((e) => e.category || 'general'))
    return ['all', ...Array.from(set)]
  }, [expenses])

  const {
    totalCredited,
    totalDebited,
    netBalance,
    lastUpdated,
    memberAccounts,
    transactionRows,
    netDebt,
    simplifiedDebts
  } = useMemo(() => {
    const totalCreditedCalc = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0)
    const totalDebitedCalc = expenses.reduce(
      (sum, expense) => sum + (expense.shares || []).reduce((s, share) => s + Number(share.amount || 0), 0),
      0
    )

    const latest = expenses.length
      ? expenses.reduce((top, e) => {
          const value = new Date(e.date || e.createdAt).getTime()
          return value > top ? value : top
        }, 0)
      : null

    const memberAccountsCalc = members.map((member) => {
      const id = getMemberId(member)
      const name = getMemberName(member)
      const email = getMemberEmail(member)
      const avatar = getMemberAvatar(member)
      const role = member.role || 'member'

      const credits = expenses
        .filter((expense) => expense.paidById === id)
        .map((expense) => ({
          id: expense.id,
          title: expense.title || 'Expense',
          date: expense.date || expense.createdAt,
          amount: Number(expense.amount || 0)
        }))

      const debits = expenses
        .map((expense) => {
          const share = (expense.shares || []).find((s) => s.userId === id)
          if (!share) return null
          return {
            id: `${expense.id}-${id}`,
            title: expense.title || 'Expense',
            date: expense.date || expense.createdAt,
            amount: Number(share.amount || 0)
          }
        })
        .filter(Boolean)

      const paid = credits.reduce((sum, item) => sum + item.amount, 0)
      const owed = debits.reduce((sum, item) => sum + item.amount, 0)
      const balance = paid - owed

      return {
        id,
        name,
        email,
        avatar,
        role,
        credits,
        debits,
        balance
      }
    })

    const transactionRowsCalc = expenses.map((expense) => ({
      id: expense.id,
      date: expense.date || expense.createdAt,
      title: expense.title || 'Expense',
      category: expense.category || 'general',
      splitType: expense.splitType || 'equal',
      amount: Number(expense.amount || 0),
      paidBy: expense.paidBy || memberMap[expense.paidById] || { id: expense.paidById, name: 'Member' },
      shares: expense.shares || []
    }))

    const memberIds = Object.keys(memberMap)
    const direct = {}
    const net = {}

    memberIds.forEach((id) => {
      direct[id] = {}
      net[id] = {}
      memberIds.forEach((other) => {
        direct[id][other] = 0
        net[id][other] = 0
      })
    })

    expenses.forEach((expense) => {
      const payer = expense.paidById
      ;(expense.shares || []).forEach((share) => {
        const debtor = share.userId
        if (!payer || !debtor || payer === debtor || !direct[debtor] || direct[debtor][payer] === undefined) return
        direct[debtor][payer] += Number(share.amount || 0)
      })
    })

    for (let i = 0; i < memberIds.length; i += 1) {
      for (let j = i + 1; j < memberIds.length; j += 1) {
        const a = memberIds[i]
        const b = memberIds[j]
        const aToB = Number(direct[a][b] || 0)
        const bToA = Number(direct[b][a] || 0)
        if (aToB > bToA) net[a][b] = aToB - bToA
        if (bToA > aToB) net[b][a] = bToA - aToB
      }
    }

    const simplified = []
    memberIds.forEach((from) => {
      memberIds.forEach((to) => {
        const amount = Number(net[from][to] || 0)
        if (from !== to && amount > 0.01) simplified.push({ from, to, amount })
      })
    })

    return {
      totalCredited: totalCreditedCalc,
      totalDebited: totalDebitedCalc,
      netBalance: totalCreditedCalc - totalDebitedCalc,
      lastUpdated: latest,
      memberAccounts: memberAccountsCalc,
      transactionRows: transactionRowsCalc,
      netDebt: net,
      simplifiedDebts: simplified
    }
  }, [expenses, members, memberMap])

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    return transactionRows.filter((row) => {
      const titleOk = !term || row.title.toLowerCase().includes(term)
      const categoryOk = category === 'all' || row.category === category
      const time = new Date(row.date).getTime()
      const fromOk = !fromDate || time >= new Date(`${fromDate}T00:00:00`).getTime()
      const toOk = !toDate || time <= new Date(`${toDate}T23:59:59`).getTime()
      return titleOk && categoryOk && fromOk && toOk
    })
  }, [transactionRows, search, category, fromDate, toDate])

  const sortedRows = useMemo(() => {
    const rows = [...filteredRows]
    rows.sort((a, b) => {
      let diff = 0
      if (sortBy === 'date') diff = new Date(a.date).getTime() - new Date(b.date).getTime()
      if (sortBy === 'amount') diff = a.amount - b.amount
      if (sortBy === 'paidBy') diff = (a.paidBy?.name || '').toLowerCase().localeCompare((b.paidBy?.name || '').toLowerCase())
      return sortOrder === 'asc' ? diff : -diff
    })
    return rows
  }, [filteredRows, sortBy, sortOrder])

  const settlements = useMemo(() => {
    const raw = settlementsData?.data?.settlements || settlementsData?.settlements || []
    if (paymentFilter === 'all') return raw
    return raw.filter((item) => (item.status || '').toLowerCase() === paymentFilter)
  }, [settlementsData, paymentFilter])

  const toggleSort = (column) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortBy(column)
    setSortOrder(column === 'paidBy' ? 'asc' : 'desc')
  }

  const sortArrow = (column) => (sortBy === column ? (sortOrder === 'asc' ? '↑' : '↓') : '')

  const clearFilters = () => {
    setSearch('')
    setCategory('all')
    setFromDate('')
    setToDate('')
  }

  const handleExportPDF = async () => {
    try {
      setExportingPDF(true)
      const { default: jsPDF } = await import('jspdf')
      const autoTableModule = await import('jspdf-autotable')
      const autoTable = autoTableModule.default || autoTableModule.autoTable

      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const generatedDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })

      doc.setFillColor(124, 58, 237)
      doc.rect(0, 0, pageWidth, 40, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(22)
      doc.setFont('helvetica', 'bold')
      doc.text('SPLITORA', 14, 18)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text('Group Expense Ledger', 14, 28)
      doc.setFontSize(9)
      doc.text(`Generated: ${generatedDate}`, pageWidth - 14, 28, { align: 'right' })
      doc.setTextColor(30, 41, 59)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text(groupName || 'Group Ledger', 14, 52)
      doc.setDrawColor(124, 58, 237)
      doc.setLineWidth(0.5)
      doc.line(14, 56, pageWidth - 14, 56)

      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 41, 59)
      doc.text('Summary', 14, 66)

      const totalAmount = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)
      const formatINR = (v) => `Rs. ${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

      const summaryData = [
        ['Total Expenses', expenses.length.toString()],
        ['Total Amount', formatINR(totalAmount)],
        ['Total Members', members.length.toString()],
        ['Avg per Expense', formatINR(expenses.length ? totalAmount / expenses.length : 0)]
      ]

      autoTable(doc, {
        startY: 70,
        head: [['Metric', 'Value']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [124, 58, 237], textColor: 255, fontStyle: 'bold', fontSize: 10 },
        bodyStyles: { fontSize: 10, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [245, 243, 255] },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 }, 1: { cellWidth: 60 } },
        margin: { left: 14, right: 14 }
      })

      const afterSummary = doc.lastAutoTable.finalY + 12
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 41, 59)
      doc.text('All Expenses', 14, afterSummary)

      const expenseRows = expenses.map((expense, index) => [
        index + 1,
        new Date(expense.date || expense.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        expense.title || '-',
        (expense.category || 'general').charAt(0).toUpperCase() + (expense.category || 'general').slice(1),
        expense.paidBy?.name || 'Unknown',
        (expense.splitType || 'equal').charAt(0).toUpperCase() + (expense.splitType || 'equal').slice(1),
        formatINR(expense.amount)
      ])

      autoTable(doc, {
        startY: afterSummary + 4,
        head: [['#', 'Date', 'Description', 'Category', 'Paid By', 'Split', 'Amount']],
        body: expenseRows,
        theme: 'striped',
        headStyles: { fillColor: [124, 58, 237], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [250, 249, 255] },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 28 },
          2: { cellWidth: 45 },
          3: { cellWidth: 25 },
          4: { cellWidth: 28 },
          5: { cellWidth: 22 },
          6: { cellWidth: 28, halign: 'right', fontStyle: 'bold' }
        },
        margin: { left: 14, right: 14 }
      })

      doc.addPage()
      doc.setFillColor(124, 58, 237)
      doc.rect(0, 0, pageWidth, 20, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('SPLITORA — Group Ledger (continued)', 14, 13)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 41, 59)
      doc.text('Member Balances', 14, 32)

      const balanceRows = memberAccounts.map((entry) => {
        const balance = Number(entry.balance || 0)
        const status = balance > 0 ? 'Will Receive' : balance < 0 ? 'Needs to Pay' : 'Settled'
        const totalPaid = entry.credits?.reduce((sum, c) => sum + Number(c.amount || 0), 0) || 0
        const totalOwed = entry.debits?.reduce((sum, d) => sum + Number(d.amount || 0), 0) || 0
        return [entry.name || 'Unknown', entry.email || '-', formatINR(totalPaid), formatINR(totalOwed), formatINR(Math.abs(balance)), status]
      })

      autoTable(doc, {
        startY: 36,
        head: [['Member', 'Email', 'Total Paid', 'Total Owed', 'Net Balance', 'Status']],
        body: balanceRows,
        theme: 'grid',
        headStyles: { fillColor: [124, 58, 237], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [245, 243, 255] },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 35 },
          1: { cellWidth: 45 },
          2: { cellWidth: 28, halign: 'right' },
          3: { cellWidth: 28, halign: 'right' },
          4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
          5: { cellWidth: 22, halign: 'center' }
        },
        didParseCell: (data) => {
          if (data.column.index === 5 && data.section === 'body') {
            const val = data.cell.raw
            if (val === 'Will Receive') data.cell.styles.textColor = [22, 163, 74]
            else if (val === 'Needs to Pay') data.cell.styles.textColor = [220, 38, 38]
            else data.cell.styles.textColor = [100, 116, 139]
          }
        },
        margin: { left: 14, right: 14 }
      })

      const afterBalances = doc.lastAutoTable.finalY + 12
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 41, 59)
      doc.text('Settlement Suggestions', 14, afterBalances)

      const creditors = balances.filter((b) => Number(b.balance) > 0.01).sort((a, b) => b.balance - a.balance)
      const debtors = balances.filter((b) => Number(b.balance) < -0.01).sort((a, b) => a.balance - b.balance)
      const settlementRows = []
      const creds = creditors.map((c) => ({ ...c, remaining: Number(c.balance) }))
      const debts = debtors.map((d) => ({ ...d, remaining: Math.abs(Number(d.balance)) }))

      let ci = 0
      let di = 0
      while (ci < creds.length && di < debts.length) {
        const amount = Math.min(creds[ci].remaining, debts[di].remaining)
        if (amount > 0.01) settlementRows.push([debts[di].name, 'pays', creds[ci].name, formatINR(amount)])
        creds[ci].remaining -= amount
        debts[di].remaining -= amount
        if (creds[ci].remaining < 0.01) ci += 1
        if (debts[di].remaining < 0.01) di += 1
      }

      if (settlementRows.length > 0) {
        autoTable(doc, {
          startY: afterBalances + 4,
          head: [['From (Payer)', '', 'To (Receiver)', 'Amount']],
          body: settlementRows,
          theme: 'plain',
          headStyles: { fillColor: [124, 58, 237], textColor: 255, fontStyle: 'bold', fontSize: 9 },
          bodyStyles: { fontSize: 10, textColor: [30, 41, 59] },
          columnStyles: {
            0: { fontStyle: 'bold', textColor: [220, 38, 38], cellWidth: 50 },
            1: { cellWidth: 20, halign: 'center', textColor: [100, 116, 139] },
            2: { fontStyle: 'bold', textColor: [22, 163, 74], cellWidth: 50 },
            3: { fontStyle: 'bold', halign: 'right', textColor: [124, 58, 237], cellWidth: 40 }
          },
          margin: { left: 14, right: 14 }
        })
      } else {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 116, 139)
        doc.text('All settled up! No pending settlements.', 14, afterBalances + 10)
      }

      doc.addPage()
      doc.setFillColor(124, 58, 237)
      doc.rect(0, 0, pageWidth, 20, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('SPLITORA — Expense Shares Detail', 14, 13)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 41, 59)
      doc.text('Expense Shares Breakdown', 14, 32)

      const sharesRows = []
      expenses.forEach((expense) => {
        if (expense.shares && expense.shares.length > 0) {
          expense.shares.forEach((share, idx) => {
            sharesRows.push([
              idx === 0 ? expense.title : '',
              idx === 0 ? new Date(expense.date || expense.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
              idx === 0 ? formatINR(expense.amount) : '',
              share.user?.name || 'Unknown',
              formatINR(share.amount),
              share.percentage ? `${share.percentage}%` : '-',
              share.isPaid ? 'Paid' : 'Pending'
            ])
          })
        }
      })

      if (sharesRows.length > 0) {
        autoTable(doc, {
          startY: 36,
          head: [['Expense', 'Date', 'Total', 'Member', 'Share Amount', 'Percentage', 'Status']],
          body: sharesRows,
          theme: 'striped',
          headStyles: { fillColor: [124, 58, 237], textColor: 255, fontStyle: 'bold', fontSize: 9 },
          bodyStyles: { fontSize: 9, textColor: [30, 41, 59] },
          alternateRowStyles: { fillColor: [250, 249, 255] },
          columnStyles: {
            0: { cellWidth: 38, fontStyle: 'bold' },
            1: { cellWidth: 24 },
            2: { cellWidth: 26, halign: 'right' },
            3: { cellWidth: 30 },
            4: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
            5: { cellWidth: 22, halign: 'center' },
            6: { cellWidth: 20, halign: 'center' }
          },
          didParseCell: (data) => {
            if (data.column.index === 6 && data.section === 'body') {
              if (data.cell.raw === 'Paid') data.cell.styles.textColor = [22, 163, 74]
              else if (data.cell.raw === 'Pending') data.cell.styles.textColor = [217, 119, 6]
            }
          },
          margin: { left: 14, right: 14 }
        })
      }

      const totalPages = doc.internal.getNumberOfPages()
      for (let i = 1; i <= totalPages; i += 1) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(148, 163, 184)
        doc.setFont('helvetica', 'normal')
        doc.text(`Splitora — Group Expense Tracker | Page ${i} of ${totalPages}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' })
        doc.text(`Confidential — Generated on ${generatedDate}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 4, { align: 'center' })
      }

      const safeName = (groupName || 'group').replace(/[^a-z0-9]/gi, '-').toLowerCase()
      doc.save(`splitora-${safeName}-ledger-${new Date().toISOString().slice(0, 10)}.pdf`)
      toast.success('Ledger exported as PDF!')
    } catch (err) {
      console.error('PDF export error:', err)
      toast.error('Failed to export PDF')
    } finally {
      setExportingPDF(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ScrollText size={18} className="text-primary-600" />
            <h2 className="text-lg font-semibold text-surface-900">Group Ledger</h2>
          </div>
          <Button variant="outline" leftIcon={<Download size={16} />} onClick={handleExportPDF} loading={exportingPDF}>
            Export PDF
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-success-200 bg-success-50 p-4">
            <p className="text-xs font-medium text-success-700">Total Credited</p>
            <p className="mt-1 text-xl font-bold text-success-700">{formatCurrency(totalCredited)}</p>
          </div>
          <div className="rounded-2xl border border-danger-200 bg-danger-50 p-4">
            <p className="text-xs font-medium text-danger-700">Total Debited</p>
            <p className="mt-1 text-xl font-bold text-danger-700">{formatCurrency(totalDebited)}</p>
          </div>
          <div className="rounded-2xl border border-surface-300 bg-surface-100 p-4">
            <p className="text-xs font-medium text-surface-700">Net Balance</p>
            <p className="mt-1 text-xl font-bold text-surface-800">{formatCurrency(netBalance)}</p>
          </div>
        </div>

        <p className="mt-4 text-xs text-surface-600">
          Last updated: {lastUpdated ? relativeTime(lastUpdated) : 'No transactions yet'}
        </p>
      </Card>

      <Card className="bg-white">
        <div className="mb-4 flex items-center gap-2">
          <Landmark size={18} className="text-primary-600" />
          <h2 className="text-lg font-semibold text-surface-900">Member Ledger Accounts</h2>
        </div>

        {memberAccounts.length ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {memberAccounts.map((account) => (
              <div key={account.id} className="rounded-2xl border border-surface-200 p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="inline-flex items-center gap-2">
                    <Avatar user={{ name: account.name, avatar: account.avatar }} size="sm" />
                    <div>
                      <p className="text-sm font-semibold text-surface-900">{account.name}</p>
                      <p className="text-xs text-surface-500">{account.email || 'No email'}</p>
                    </div>
                  </div>
                  <Badge variant={account.role === 'admin' ? 'info' : 'default'} size="sm">
                    {account.role === 'admin' ? 'Admin' : 'Member'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <div className="rounded-xl border border-success-200 bg-success-50 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-success-700">Credit (Paid)</p>
                    <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                      {account.credits.length ? (
                        account.credits.map((item) => (
                          <div key={item.id} className="grid grid-cols-[58px_1fr_auto] items-center gap-2 text-xs">
                            <span className="text-surface-500">{formatDateShort(item.date)}</span>
                            <span className="truncate text-surface-700">{item.title}</span>
                            <span className="font-semibold text-success-700">{formatCurrency(item.amount)}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-surface-500">No credits</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-danger-200 bg-danger-50 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-danger-700">Debit (Owed)</p>
                    <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                      {account.debits.length ? (
                        account.debits.map((item) => (
                          <div key={item.id} className="grid grid-cols-[58px_1fr_auto] items-center gap-2 text-xs">
                            <span className="text-surface-500">{formatDateShort(item.date)}</span>
                            <span className="truncate text-surface-700">{item.title}</span>
                            <span className="font-semibold text-danger-700">{formatCurrency(item.amount)}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-surface-500">No debits</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between rounded-xl bg-surface-100 px-3 py-2">
                  <p className="text-sm font-medium text-surface-700">Balance</p>
                  <p className={`text-sm font-bold ${account.balance >= 0 ? 'text-success-700' : 'text-danger-700'}`}>
                    {account.balance >= 0 ? '+' : ''}
                    {formatCurrency(account.balance)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center text-surface-500">👥 No member accounts available yet</div>
        )}
      </Card>

      <Card className="bg-white">
        <div className="mb-4 flex items-center gap-2">
          <ListOrdered size={18} className="text-primary-600" />
          <h2 className="text-lg font-semibold text-surface-900">Transaction Ledger</h2>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-5">
          <label className="lg:col-span-2">
            <span className="mb-1 block text-xs font-medium text-surface-600">Search description</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search expense title"
              className="h-10 w-full rounded-xl border border-surface-300 bg-white px-3 text-sm focus:border-primary-400 focus:outline-none"
            />
          </label>

          <label>
            <span className="mb-1 block text-xs font-medium text-surface-600">Category</span>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-10 w-full appearance-none rounded-xl border border-surface-300 bg-white px-3 pr-8 text-sm focus:border-primary-400 focus:outline-none"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2 top-3 text-surface-500" />
            </div>
          </label>

          <label>
            <span className="mb-1 block text-xs font-medium text-surface-600">From</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-10 w-full rounded-xl border border-surface-300 bg-white px-3 text-sm focus:border-primary-400 focus:outline-none"
            />
          </label>

          <label>
            <span className="mb-1 block text-xs font-medium text-surface-600">To</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-10 w-full rounded-xl border border-surface-300 bg-white px-3 text-sm focus:border-primary-400 focus:outline-none"
            />
          </label>
        </div>

        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-surface-600">
          <p>Showing {sortedRows.length} of {transactionRows.length} transactions</p>
          {(search || category !== 'all' || fromDate || toDate) ? (
            <Button size="sm" variant="outline" leftIcon={<Filter size={14} />} onClick={clearFilters}>
              Clear Filters
            </Button>
          ) : null}
        </div>

        {sortedRows.length ? (
          <div className="overflow-x-auto rounded-xl border border-surface-200">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="sticky top-0 bg-surface-100 text-surface-700">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">
                    <button className="inline-flex items-center gap-1" onClick={() => toggleSort('date')}>
                      Date {sortArrow('date')}
                    </button>
                  </th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">
                    <button className="inline-flex items-center gap-1" onClick={() => toggleSort('paidBy')}>
                      Paid By {sortArrow('paidBy')}
                    </button>
                  </th>
                  <th className="px-3 py-2">Split Type</th>
                  <th className="px-3 py-2">
                    <button className="inline-flex items-center gap-1" onClick={() => toggleSort('amount')}>
                      Amount {sortArrow('amount')}
                    </button>
                  </th>
                  <th className="px-3 py-2">Shares</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, idx) => (
                  <tr key={row.id} className="border-t border-surface-200 hover:bg-surface-50">
                    <td className="px-3 py-2">{idx + 1}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatDate(row.date)}</td>
                    <td className="px-3 py-2">
                      <div className="max-w-[220px] truncate" title={row.title}>
                        <span className="mr-1">{CATEGORY_EMOJI[row.category] || '🧾'}</span>
                        {row.title}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Badge size="sm" variant="default">{row.category}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <div className="inline-flex items-center gap-2">
                        <Avatar user={row.paidBy} size="sm" />
                        <span>{row.paidBy?.name || 'Member'}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Badge size="sm" variant="info">
                        {(row.splitType || 'equal').charAt(0).toUpperCase() + (row.splitType || 'equal').slice(1)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 font-semibold">{formatCurrency(row.amount)}</td>
                    <td className="px-3 py-2">
                      <div className="flex -space-x-2">
                        {row.shares.map((share, sIdx) => {
                          const user = share.user || memberMap[share.userId] || { name: 'Member' }
                          const title = `${user.name || 'Member'}: ${formatCurrency(share.amount)}`
                          return (
                            <div key={`${row.id}-${share.userId}-${sIdx}`} title={title} className="rounded-full ring-2 ring-white">
                              <Avatar user={user} size="sm" />
                            </div>
                          )
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-surface-300 py-10 text-center">
            <p className="text-2xl">🔍</p>
            <p className="mt-2 text-sm font-medium text-surface-700">No transactions match your filters</p>
            <Button className="mt-3" variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        )}
      </Card>

      <Card className="bg-white">
        <div className="mb-4 flex items-center gap-2">
          <HandCoins size={18} className="text-primary-600" />
          <h2 className="text-lg font-semibold text-surface-900">Debt Ledger</h2>
        </div>

        <div className="overflow-x-auto rounded-xl border border-surface-200">
          <table className="min-w-[760px] w-full text-center text-sm">
            <thead className="bg-surface-100">
              <tr>
                <th className="px-3 py-2 text-left">Owes \ Owed To</th>
                {members.map((member) => (
                  <th key={`col-${getMemberId(member)}`} className="px-3 py-2">
                    {getMemberName(member)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((debtor) => {
                const debtorId = getMemberId(debtor)
                return (
                  <tr key={`row-${debtorId}`} className="border-t border-surface-200">
                    <td className="px-3 py-2 text-left font-medium">{getMemberName(debtor)}</td>
                    {members.map((creditor) => {
                      const creditorId = getMemberId(creditor)
                      if (debtorId === creditorId) return <td key={`${debtorId}-${creditorId}`} className="px-3 py-2 text-surface-400">—</td>
                      const value = Number(netDebt[debtorId]?.[creditorId] || 0)
                      if (value > 0.01) {
                        return (
                          <td key={`${debtorId}-${creditorId}`} className="px-3 py-2">
                            <span className="inline-flex rounded-lg bg-success-100 px-2 py-1 text-xs font-semibold text-success-700">
                              {formatCurrency(value)}
                            </span>
                          </td>
                        )
                      }
                      return <td key={`${debtorId}-${creditorId}`} className="px-3 py-2 text-surface-400">-</td>
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 rounded-xl border border-surface-200 bg-surface-50 p-3">
          <h3 className="mb-2 text-sm font-semibold text-surface-800">Simplified debts</h3>
          {simplifiedDebts.length ? (
            <div className="space-y-1 text-sm text-surface-700">
              {simplifiedDebts.map((item) => (
                <p key={`${item.from}-${item.to}`}>
                  {memberMap[item.from]?.name || 'Member'} owes {memberMap[item.to]?.name || 'Member'} {formatCurrency(item.amount)}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-surface-600">All debts settled! 🎉</p>
          )}
        </div>
      </Card>

      <Card className="bg-white">
        <div className="mb-4 flex items-center gap-2">
          <CalendarRange size={18} className="text-primary-600" />
          <h2 className="text-lg font-semibold text-surface-900">Payment History</h2>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {['all', 'completed', 'pending'].map((key) => (
            <Button key={key} size="sm" variant={paymentFilter === key ? 'primary' : 'outline'} onClick={() => setPaymentFilter(key)}>
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </Button>
          ))}
        </div>

        {isSettlementsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="md" />
          </div>
        ) : settlements.length ? (
          <div className="relative space-y-4 pl-6">
            <div className="absolute left-2 top-0 h-full w-0.5 bg-primary-200" />
            {settlements.map((settlement) => {
              const status = (settlement.status || 'pending').toLowerCase()
              const paymentMethod = settlement.paymentMethod || (settlement.razorpayPaymentId ? 'Razorpay' : 'Manual')
              return (
                <div key={settlement.id} className="relative rounded-xl border border-surface-200 bg-white p-3">
                  <span className="absolute -left-[18px] top-4 h-3.5 w-3.5 rounded-full border-2 border-primary-500 bg-white" />
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge size="sm" variant="default">{formatDate(settlement.createdAt)}</Badge>
                    <Badge size="sm" variant={status === 'completed' ? 'success' : 'warning'}>
                      {status === 'completed' ? 'Completed' : 'Pending'}
                    </Badge>
                    <Badge size="sm" variant="info">{paymentMethod}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <div className="inline-flex items-center gap-2">
                      <Avatar user={settlement.payer} size="sm" />
                      <span className="font-medium text-surface-900">{settlement.payer?.name || 'Member'}</span>
                    </div>
                    <ArrowDownUp size={14} className="text-surface-400" />
                    <div className="inline-flex items-center gap-2">
                      <Avatar user={settlement.receiver} size="sm" />
                      <span className="font-medium text-surface-900">{settlement.receiver?.name || 'Member'}</span>
                    </div>
                    <span className="ml-auto rounded-lg bg-primary-50 px-2 py-1 text-xs font-semibold text-primary-700">
                      {formatCurrency(settlement.amount)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-surface-300 py-10 text-center">
            <p className="text-2xl">💸</p>
            <p className="mt-2 text-sm font-medium text-surface-700">No payments recorded yet. Use settlement suggestions to settle up.</p>
          </div>
        )}
      </Card>
    </div>
  )
}
