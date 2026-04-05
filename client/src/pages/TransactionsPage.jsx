import { useMemo, useState } from 'react'
import { ScrollText, Download, Filter, Search, CalendarRange } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuth from '../hooks/useAuth'
import { useMyTransactions } from '../hooks/useStats'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'

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

const CATEGORY_EMOJI = {
  food: '🍽️',
  travel: '✈️',
  home: '🏠',
  event: '🎉',
  entertainment: '🎬',
  shopping: '🛍️',
  general: '🧾'
}

export default function TransactionsPage() {
  const { user } = useAuth()
  const { data, isLoading, isError } = useMyTransactions()
  const [exportingPDF, setExportingPDF] = useState(false)

  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all') // 'all', 'expense', 'settlement'
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const transactions = useMemo(() => {
    return data?.data?.transactions || data?.transactions || []
  }, [data])

  const filteredTransactions = useMemo(() => {
    let result = [...transactions]

    if (filterType !== 'all') {
      result = result.filter(t => t.eventType === filterType)
    }

    if (search.trim()) {
      const term = search.toLowerCase().trim()
      result = result.filter(t => {
        const titleMatch = t.title && t.title.toLowerCase().includes(term)
        const groupMatch = t.group?.name && t.group.name.toLowerCase().includes(term)
        return titleMatch || groupMatch
      })
    }

    if (fromDate) {
      const fromTimestamp = new Date(`${fromDate}T00:00:00`).getTime()
      result = result.filter(t => new Date(t.date).getTime() >= fromTimestamp)
    }

    if (toDate) {
      const toTimestamp = new Date(`${toDate}T23:59:59`).getTime()
      result = result.filter(t => new Date(t.date).getTime() <= toTimestamp)
    }

    return result
  }, [transactions, filterType, search, fromDate, toDate])

  const handleExportPDF = async () => {
    if (!filteredTransactions.length) {
      toast.error('No transactions to export')
      return
    }

    try {
      setExportingPDF(true)
      const { default: jsPDF } = await import('jspdf')
      const autoTableModule = await import('jspdf-autotable')
      const autoTable = autoTableModule.default || autoTableModule.autoTable

      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const generatedDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })

      // Header
      doc.setFillColor(124, 58, 237)
      doc.rect(0, 0, pageWidth, 40, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(22)
      doc.setFont('helvetica', 'bold')
      doc.text('SPLITORA', 14, 18)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text('My Transactions Ledger', 14, 28)
      doc.setFontSize(9)
      doc.text(`Generated: ${generatedDate}`, pageWidth - 14, 28, { align: 'right' })

      doc.setTextColor(30, 41, 59)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text(`${user?.name || 'User'}'s Transactions`, 14, 52)
      doc.setDrawColor(124, 58, 237)
      doc.setLineWidth(0.5)
      doc.line(14, 56, pageWidth - 14, 56)

      const formatINR = (v) => `Rs. ${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

      const rows = filteredTransactions.map((t, index) => {
        const dateStr = formatDate(t.date)
        const typeStr = t.eventType.charAt(0).toUpperCase() + t.eventType.slice(1)
        const amountStr = formatINR(t.amount)
        const groupStr = t.group?.name || 'Unknown Group'

        let descStr = '-'
        let actionStr = '-'

        if (t.eventType === 'expense') {
          descStr = t.title || 'Expense'
          const paidByName = t.paidBy?.name || 'Someone'
          actionStr = `Paid by ${paidByName}`
        } else if (t.eventType === 'settlement') {
          descStr = 'Settlement'
          const payerName = t.payer?.name || 'Someone'
          const receiverName = t.receiver?.name || 'Someone'
          actionStr = `${payerName} -> ${receiverName}`
        }

        return [
          index + 1,
          dateStr,
          typeStr,
          groupStr,
          descStr,
          actionStr,
          amountStr
        ]
      })

      autoTable(doc, {
        startY: 64,
        head: [['#', 'Date', 'Type', 'Group', 'Description', 'Action', 'Amount']],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [124, 58, 237], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [250, 249, 255] },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 24 },
          2: { cellWidth: 20 },
          3: { cellWidth: 35 },
          4: { cellWidth: 35 },
          5: { cellWidth: 35 },
          6: { cellWidth: 25, halign: 'right', fontStyle: 'bold' }
        },
        margin: { left: 14, right: 14 }
      })

      const totalPages = doc.internal.getNumberOfPages()
      for (let i = 1; i <= totalPages; i += 1) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(148, 163, 184)
        doc.setFont('helvetica', 'normal')
        doc.text(`Splitora — My Transactions | Page ${i} of ${totalPages}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' })
      }

      doc.save(`splitora-my-transactions-${new Date().toISOString().slice(0, 10)}.pdf`)
      toast.success('Transactions exported as PDF!')
    } catch (err) {
      console.error('PDF export error:', err)
      toast.error('Failed to export PDF')
    } finally {
      setExportingPDF(false)
    }
  }

  const clearFilters = () => {
    setSearch('')
    setFilterType('all')
    setFromDate('')
    setToDate('')
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (isError) {
    return (
      <Card>
        <p className="text-center text-danger-600">Failed to load transactions.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Card className="bg-white dark:bg-dark-100 border-none shadow-sm pb-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/40 text-primary-600">
              <ScrollText size={20} />
            </span>
            <div>
              <h1 className="text-xl font-bold text-surface-900 dark:text-white">My Transactions</h1>
              <p className="text-sm text-surface-500 dark:text-slate-400">View and manage all your historical activity</p>
            </div>
          </div>
          <Button variant="outline" leftIcon={<Download size={16} />} onClick={handleExportPDF} loading={exportingPDF} disabled={filteredTransactions.length === 0}>
            Export PDF
          </Button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-surface-400 dark:text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Search by title or group"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-surface-200 dark:border-dark-50 bg-surface-50 dark:bg-dark-50 text-surface-900 dark:text-white placeholder:text-surface-400 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
            />
          </div>
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-surface-200 dark:border-dark-50 bg-surface-50 dark:bg-dark-50 text-surface-900 dark:text-white focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
            >
              <option value="all">All Types</option>
              <option value="expense">Expenses</option>
              <option value="settlement">Settlements</option>
            </select>
          </div>
          <div className="relative">
            <CalendarRange className="absolute left-3 top-2.5 text-surface-400 dark:text-slate-500" size={16} />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-surface-200 dark:border-dark-50 bg-surface-50 dark:bg-dark-50 text-surface-900 dark:text-white focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
              title="From Date"
            />
          </div>
          <div className="relative">
            <CalendarRange className="absolute left-3 top-2.5 text-surface-400 dark:text-slate-500" size={16} />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-surface-200 dark:border-dark-50 bg-surface-50 dark:bg-dark-50 text-surface-900 dark:text-white focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
              title="To Date"
            />
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between text-xs text-surface-600 dark:text-slate-400">
          <p>Showing {filteredTransactions.length} of {transactions.length} transactions</p>
          {(search || filterType !== 'all' || fromDate || toDate) && (
            <button onClick={clearFilters} className="text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-1">
              <Filter size={12} /> Clear Filters
            </button>
          )}
        </div>

        {filteredTransactions.length ? (
          <div className="overflow-x-auto rounded-xl border border-surface-200 dark:border-dark-50">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-surface-50 dark:bg-dark-50 text-surface-700 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Group</th>
                  <th className="px-4 py-3 font-semibold">Details</th>
                  <th className="px-4 py-3 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200 dark:divide-dark-50">
                {filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-surface-50/50 dark:hover:bg-dark-50/50 transition">
                    <td className="px-4 py-3 whitespace-nowrap text-surface-600 dark:text-slate-300">
                      {formatDate(t.date)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={t.eventType === 'expense' ? 'info' : 'success'} size="sm">
                        {t.eventType === 'expense' ? 'Expense' : 'Settlement'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-surface-900 dark:text-white font-medium">
                      {t.group?.name || 'Unknown Group'}
                    </td>
                    <td className="px-4 py-3">
                      {t.eventType === 'expense' ? (
                        <div>
                          <p className="text-surface-900 dark:text-white font-medium">
                            <span className="mr-1">{CATEGORY_EMOJI[t.category] || '🧾'}</span>
                            {t.title}
                          </p>
                          <p className="text-xs text-surface-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                            Paid by <Avatar user={t.paidBy} size="xs" className="w-4 h-4 inline-block" /> {t.paidBy?.name || 'Unknown'}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-surface-900 dark:text-white font-medium">Settlement</p>
                          <p className="text-xs text-surface-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                            <Avatar user={t.payer} size="xs" className="w-4 h-4 inline-block" /> {t.payer?.name}
                            <span className="text-xs">→</span>
                            <Avatar user={t.receiver} size="xs" className="w-4 h-4 inline-block" /> {t.receiver?.name}
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-surface-900 dark:text-white">
                      {formatCurrency(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-100 dark:bg-dark-50 text-surface-400 dark:text-slate-500 mb-4">
              <ScrollText size={32} />
            </div>
            <h3 className="text-lg font-medium text-surface-900 dark:text-white mb-1">No transactions found</h3>
            <p className="text-sm text-surface-500 dark:text-slate-400 max-w-sm">
              We couldn't find any transactions matching your filters. Try adjusting your search criteria.
            </p>
            {(search || filterType !== 'all' || fromDate || toDate) && (
              <Button onClick={clearFilters} variant="outline" className="mt-4">
                Clear all filters
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
