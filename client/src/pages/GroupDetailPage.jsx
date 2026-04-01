import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, Share2, Copy } from 'lucide-react'
import { useGroup, useAddMember, useGenerateInviteCode } from '../hooks/useGroups'
import { useDeleteExpense } from '../hooks/useExpenses'
import useSocket from '../hooks/useSocket'
import { downloadQR, generateQRDataUrl } from '../utils/generateQR'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import ExpenseCard from '../components/expenses/ExpenseCard'
import AddExpenseModal from '../components/expenses/AddExpenseModal'
import SettlementSuggestions from '../components/settlements/SettlementSuggestions'
import AddMemberModal from '../components/groups/AddMemberModal'
import GroupAnalytics from '../components/analytics/GroupAnalytics'
import GroupLedger from '../components/analytics/GroupLedger'

const TABS = ['expenses', 'balances', 'settlements', 'analytics', 'ledger']

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(value || 0)

const buildInviteUrl = (code) => `https://splitora-tawny.vercel.app/join/${code}`

export default function GroupDetailPage() {
  const { id } = useParams()
  useSocket(id)

  const [activeTab, setActiveTab] = useState('expenses')
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false)
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')

  const { data, isLoading, refetch } = useGroup(id)
  const addMemberMutation = useAddMember(id)
  const deleteExpenseMutation = useDeleteExpense(id)
  const inviteMutation = useGenerateInviteCode()

  const group = data?.data?.group || data?.group
  const members = useMemo(() => group?.members || [], [group])
  const expenses = useMemo(() => group?.expenses || [], [group])
  const balances = useMemo(() => group?.balances || [], [group])

  const totalGroupSpending = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0)
  const effectiveInviteCode = inviteCode || group?.inviteCode || ''
  const inviteUrl = effectiveInviteCode ? buildInviteUrl(effectiveInviteCode) : ''

  useEffect(() => {
    setInviteCode(group?.inviteCode || '')
  }, [group?.inviteCode])

  useEffect(() => {
    let cancelled = false
    if (!inviteUrl) {
      setQrDataUrl('')
      return
    }

    generateQRDataUrl(inviteUrl).then((dataUrl) => {
      if (!cancelled) setQrDataUrl(dataUrl || '')
    })

    return () => {
      cancelled = true
    }
  }, [inviteUrl])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-2xl bg-surface-200" />
        <div className="h-64 animate-pulse rounded-2xl bg-surface-200" />
      </div>
    )
  }

  if (!group) {
    return <Card><p className="text-sm text-surface-600">Group not found.</p></Card>
  }

  const handleDeleteExpense = async (expense) => {
    if (!window.confirm(`Delete expense "${expense.title}"?`)) return
    try {
      await deleteExpenseMutation.mutateAsync(expense.id)
      refetch()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to delete expense')
    }
  }

  const handleGenerateCode = async () => {
    try {
      const response = await inviteMutation.mutateAsync(id)
      const code = response?.data?.inviteCode || response?.inviteCode || ''
      if (!code) {
        toast.error('Failed to generate code')
        return
      }
      setInviteCode(code)
      toast.success('Invite code generated')
      refetch()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to generate code')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-surface-900">{group.name}</h1>
              <Badge variant="info">{group.category}</Badge>
            </div>
            {group.description ? <p className="mt-2 text-sm text-surface-600">{group.description}</p> : null}
            <div className="mt-4 flex items-center gap-2">
              {members.map((member) => (
                <Avatar key={member.userId || member.id} user={member.user || member} size="sm" />
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" leftIcon={<Share2 size={16} />} onClick={() => setIsShareOpen(true)}>Share Group</Button>
            <Button variant="outline" leftIcon={<Plus size={16} />} onClick={() => setIsAddMemberOpen(true)}>Add Member</Button>
            <Button leftIcon={<Plus size={16} />} onClick={() => setIsAddExpenseOpen(true)}>Add Expense</Button>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Button key={tab} variant={activeTab === tab ? 'primary' : 'outline'} size="sm" onClick={() => setActiveTab(tab)}>
            {tab[0].toUpperCase() + tab.slice(1)}
          </Button>
        ))}
      </div>

      {activeTab === 'expenses' && (
        <div className="space-y-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-surface-900">Expenses</h2>
            <Button leftIcon={<Plus size={16} />} onClick={() => setIsAddExpenseOpen(true)}>
              Add Expense
            </Button>
          </div>
          {expenses.length ? (
            expenses.map((expense) => (
              <ExpenseCard key={expense.id} expense={expense} onDelete={handleDeleteExpense} />
            ))
          ) : (
            <Card><p className="text-sm text-surface-600">No expenses yet.</p></Card>
          )}
        </div>
      )}

      {activeTab === 'balances' && (
        <Card>
          <h2 className="mb-2 text-lg font-semibold text-surface-900">Balances</h2>
          <p className="mb-4 text-sm text-surface-600">Total group spending: <span className="font-semibold text-surface-900">{formatCurrency(totalGroupSpending)}</span></p>
          <div className="space-y-2">
            {balances.length ? (
              balances.map((entry) => (
                <div key={entry.userId} className="flex items-center justify-between rounded-xl border border-surface-200 bg-surface-50 px-3 py-2">
                  <div className="inline-flex items-center gap-2">
                    <Avatar user={{ name: entry.name, avatar: entry.avatar }} size="sm" />
                    <span className="text-sm font-medium text-surface-900">{entry.name}</span>
                  </div>
                  <span className={`text-sm font-semibold ${entry.balance >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                    {entry.balance >= 0 ? '+' : ''}{formatCurrency(entry.balance)}
                  </span>
                </div>
              ))
            ) : <p className="text-sm text-surface-600">No balances yet.</p>}
          </div>
        </Card>
      )}

      {activeTab === 'settlements' && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-surface-900">Settlement suggestions</h2>
          <SettlementSuggestions groupId={id} />
        </Card>
      )}

      {activeTab === 'analytics' && (
        <GroupAnalytics expenses={expenses} members={members} balances={balances} />
      )}

      {activeTab === 'ledger' && (
        <GroupLedger expenses={expenses} members={members} balances={balances} groupId={id} groupName={group?.name || 'Group'} />
      )}

      {activeTab === 'expenses' && (
        <button
          onClick={() => setIsAddExpenseOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg transition hover:bg-primary-700 hover:scale-105"
        >
          <Plus size={24} />
        </button>
      )}

      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        onSubmit={(email) => addMemberMutation.mutateAsync(email)}
        loading={addMemberMutation.isPending}
      />

      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        groupId={id}
        members={members}
        onCreated={() => {
          setIsAddExpenseOpen(false)
          refetch()
        }}
      />

      <Modal isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} title="Share Group" size="md">
        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-surface-500">Group Code</h3>
            {effectiveInviteCode ? (
              <div className="rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-center text-2xl font-bold tracking-widest text-primary-700">
                {effectiveInviteCode}
              </div>
            ) : (
              <Button onClick={handleGenerateCode} loading={inviteMutation.isPending}>Generate Code</Button>
            )}
            {effectiveInviteCode ? (
              <Button
                variant="outline"
                leftIcon={<Copy size={14} />}
                onClick={async () => {
                  await navigator.clipboard.writeText(effectiveInviteCode)
                  toast.success('Code copied')
                }}
              >
                Copy Code
              </Button>
            ) : null}
          </section>

          {effectiveInviteCode ? (
            <>
              <section className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-surface-500">Invite Link</h3>
                <div className="rounded-lg border border-surface-300 bg-surface-100 p-3 text-xs break-all">{inviteUrl}</div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    leftIcon={<Copy size={14} />}
                    onClick={async () => {
                      await navigator.clipboard.writeText(inviteUrl)
                      toast.success('Link copied')
                    }}
                  >
                    Copy Link
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const text = encodeURIComponent(`Join my Splitora group! Use code: ${effectiveInviteCode} or click: ${inviteUrl}`)
                      window.open(`https://wa.me/?text=${text}`, '_blank')
                    }}
                  >
                    Share on WhatsApp
                  </Button>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-surface-500">QR Code</h3>
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Group invite QR" className="mx-auto h-52 w-52 rounded-xl border border-surface-200 bg-white p-2" />
                ) : (
                  <p className="text-sm text-surface-500">Generating QR...</p>
                )}
                <Button
                  variant="outline"
                  onClick={() => downloadQR(inviteUrl, `splitora-${group.name?.replace(/\s+/g, '-').toLowerCase() || 'group'}-qr.png`)}
                >
                  Download QR
                </Button>
              </section>
            </>
          ) : null}
        </div>
      </Modal>
    </div>
  )
}
