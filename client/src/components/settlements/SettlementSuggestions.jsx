import { ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSettlementSuggestions, useConfirmSettlement } from '../../hooks/useSettlements'
import { createSettlement } from '../../api/settlements.api'
import PayWithRazorpay from '../payments/PayWithRazorpay'
import Card from '../ui/Card'
import Avatar from '../ui/Avatar'
import Button from '../ui/Button'

const formatCurrency = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(v || 0)

export default function SettlementSuggestions({ groupId }) {
  const { data, isLoading, refetch } = useSettlementSuggestions(groupId)
  const confirmMutation = useConfirmSettlement(groupId)
  const suggestions = data?.data?.suggestions || data?.suggestions || []

  if (isLoading) return <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-200 dark:bg-dark-50" />)}</div>

  if (!suggestions.length) return (
    <div className="rounded-xl border border-dashed border-surface-300 dark:border-slate-600 py-8 text-center">
      <p className="text-2xl">🎉</p>
      <p className="mt-2 text-sm font-medium text-surface-700 dark:text-slate-200">All settled up!</p>
      <p className="text-xs text-surface-500 dark:text-slate-400">No pending settlements.</p>
    </div>
  )

  const handleConfirm = async (item) => {
    if (!window.confirm(`Mark: ${item.fromUser?.name} pays ${item.toUser?.name} ${formatCurrency(item.amount)}?`)) return
    try {
      let settlementId = item.settlementId
      if (!settlementId) {
        const res = await createSettlement({ groupId, payerId: item.from, receiverId: item.to, amount: item.amount })
        settlementId = res?.data?.settlement?.id
      }
      if (settlementId) await confirmMutation.mutateAsync(settlementId)
      toast.success('Settlement recorded!')
      refetch()
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed') }
  }

  return (
    <div className="space-y-3">
      {suggestions.map((item, i) => (
        <Card key={`${item.from}-${item.to}-${i}`}>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="flex items-center gap-2"><Avatar user={item.fromUser} size="sm" /><span className="font-medium text-surface-900 dark:text-white">{item.fromUser?.name || 'Member'}</span></div>
            <ArrowRight size={14} className="text-surface-400 dark:text-slate-500" />
            <div className="flex items-center gap-2"><Avatar user={item.toUser} size="sm" /><span className="font-medium text-surface-900 dark:text-white">{item.toUser?.name || 'Member'}</span></div>
            <span className="text-surface-500 dark:text-slate-400">pays</span>
            <span className="font-bold text-primary-700 dark:text-primary-300">{formatCurrency(item.amount)}</span>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" loading={confirmMutation.isPending} onClick={() => handleConfirm(item)}>Mark settled</Button>
              {item.settlementId && <PayWithRazorpay settlement={{ id: item.settlementId, amount: item.amount, payer: item.fromUser, receiver: item.toUser }} onSuccess={() => { toast.success('Payment done!'); refetch() }} />}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
