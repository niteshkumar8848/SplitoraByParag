import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { ArrowUpRight, HandCoins, Plus, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuth from '../hooks/useAuth'
import { useDashboardStats } from '../hooks/useStats'
import { joinByInviteCode } from '../api/groups.api'
import GroupCard from '../components/groups/GroupCard'
import SpendingInsights from '../components/ai/SpendingInsights'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(value || 0)

const SkeletonBlock = ({ className }) => (
  <div className={`animate-pulse rounded-xl bg-surface-200 dark:bg-dark-50 ${className}`} />
)

const extractInviteCode = (text) => {
  const value = String(text || '').trim()
  if (!value) return ''
  if (value.includes('/join/')) {
    const idx = value.lastIndexOf('/join/')
    return value.slice(idx + 6).split(/[?#]/)[0]
  }
  return value
}

function JoinGroupModal({ isOpen, onClose, onJoin }) {
  const [tab, setTab] = useState('code')
  const [code, setCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [scanStatus, setScanStatus] = useState('')
  const [permissionError, setPermissionError] = useState('')
  const scannerRef = useRef(null)
  const regionIdRef = useRef(`join-qr-reader-${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    if (!isOpen || tab !== 'scan') return undefined

    let isMounted = true
    setPermissionError('')
    setScanStatus('Camera scanning...')
    const scanner = new Html5Qrcode(regionIdRef.current)
    scannerRef.current = scanner

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 240, height: 240 } },
      async (decodedText) => {
        if (!isMounted) return
        const inviteCode = extractInviteCode(decodedText)
        if (!inviteCode) return

        try {
          setIsJoining(true)
          await onJoin(inviteCode)
          await scanner.stop()
          await scanner.clear()
        } catch {
          // handled by parent
        } finally {
          setIsJoining(false)
        }
      },
      () => {}
    ).catch((err) => {
      if (!isMounted) return
      setPermissionError(err?.message || 'Camera access denied. Please allow camera permission and try again.')
      setScanStatus('')
    })

    return () => {
      isMounted = false
      const activeScanner = scannerRef.current
      scannerRef.current = null
      if (activeScanner) {
        activeScanner.stop().catch(() => {}).finally(() => {
          activeScanner.clear().catch(() => {})
        })
      }
    }
  }, [isOpen, tab, onJoin])

  const handleJoinCode = async (event) => {
    event.preventDefault()
    const inviteCode = extractInviteCode(code)
    if (!inviteCode) {
      toast.error('Please enter a valid invite code')
      return
    }
    setIsJoining(true)
    try {
      await onJoin(inviteCode)
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Join a Group" size="sm">
      <div className="space-y-4">
        <div className="flex gap-2">
          <Button size="sm" variant={tab === 'code' ? 'primary' : 'outline'} onClick={() => setTab('code')}>Enter Code</Button>
          <Button size="sm" variant={tab === 'scan' ? 'primary' : 'outline'} onClick={() => setTab('scan')}>Scan QR</Button>
        </div>

        {tab === 'code' ? (
          <form onSubmit={handleJoinCode} className="space-y-3">
            <Input
              label="Invite code"
              placeholder="Enter group code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <div className="flex justify-end">
              <Button type="submit" loading={isJoining}>Join</Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-surface-600 dark:text-slate-300">{scanStatus || 'Use your camera to scan a Splitora invite QR code.'}</p>
            <div id={regionIdRef.current} className="min-h-64 rounded-xl border border-surface-200 dark:border-dark-50 bg-surface-100 dark:bg-dark-50 p-2" />
            {permissionError ? <p className="text-sm text-danger-600">{permissionError}</p> : null}
            {isJoining ? <p className="text-sm text-primary-600">Joining group...</p> : null}
          </div>
        )}
      </div>
    </Modal>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data, isLoading } = useDashboardStats()
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)

  const payload = data?.data || data || {}
  const totalGroups = payload?.totalGroups || 0
  const totalExpensesThisMonth = payload?.totalExpensesThisMonth || 0
  const totalYouOwe = payload?.totalYouOwe || 0
  const totalOwedToYou = payload?.totalOwedToYou || 0
  const recentGroups = payload?.recentGroups || []
  const recentExpenses = payload?.recentExpenses || []

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const handleJoinByCode = async (rawCode) => {
    const code = extractInviteCode(rawCode)
    if (!code) {
      toast.error('Invalid invite code')
      return
    }

    try {
      await joinByInviteCode(code)
      toast.success('Joined group!')
      setIsJoinModalOpen(false)
      navigate('/groups')
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to join group')
      throw error
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
            {greeting}, {user?.name || 'there'}
          </h1>
          <p className="mt-1 text-sm text-surface-600 dark:text-slate-300">
            Here is a quick snapshot of your shared expenses and settlements.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button leftIcon={<Plus size={16} />} onClick={() => navigate('/groups')}>
            Create Group
          </Button>
          <Button variant="outline" leftIcon={<UserPlus size={16} />} onClick={() => setIsJoinModalOpen(true)}>
            Join Group
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <Card key={idx}>
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="mt-3 h-7 w-32" />
            </Card>
          ))
        ) : (
          <>
            <Card>
              <div className="text-sm text-surface-600 dark:text-slate-300">Total groups</div>
              <div className="mt-2 text-2xl font-bold text-surface-900 dark:text-white">{totalGroups}</div>
            </Card>
            <Card>
              <div className="text-sm text-surface-600 dark:text-slate-300">Expenses this month</div>
              <div className="mt-2 text-2xl font-bold text-surface-900 dark:text-white">{formatCurrency(totalExpensesThisMonth)}</div>
            </Card>
            <Card>
              <div className="text-sm text-surface-600 dark:text-slate-300">You owe</div>
              <div className="mt-2 text-2xl font-bold text-danger-600">{formatCurrency(totalYouOwe)}</div>
            </Card>
            <Card>
              <div className="text-sm text-surface-600 dark:text-slate-300">Owed to you</div>
              <div className="mt-2 text-2xl font-bold text-success-600">{formatCurrency(totalOwedToYou)}</div>
            </Card>
          </>
        )}
      </section>

      <SpendingInsights />

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Recent groups</h2>
            <Badge variant="info" size="sm">Last 3</Badge>
          </div>
          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <SkeletonBlock key={idx} className="h-24 w-full" />
              ))
            ) : recentGroups.length ? (
              recentGroups.map((group) => (
                <GroupCard key={group.id} {...group} />
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-surface-300 dark:border-slate-600 p-6 text-center">
                <p className="text-sm text-surface-600 dark:text-slate-300">No groups yet.</p>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Recent expenses</h2>
            <Badge variant="default" size="sm">Last 5</Badge>
          </div>
          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <SkeletonBlock key={idx} className="h-16 w-full" />
              ))
            ) : recentExpenses.length ? (
              recentExpenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between rounded-xl border border-surface-200 dark:border-dark-50 bg-surface-50 dark:bg-dark-100 p-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Avatar user={expense.paidBy} size="sm" />
                      <p className="truncate text-sm font-semibold text-surface-900 dark:text-white">{expense.title}</p>
                    </div>
                    <p className="mt-1 text-xs text-surface-600 dark:text-slate-300">
                      {expense.group?.name || 'Unknown group'} • Paid by {expense.paidBy?.name || 'Unknown'} • {new Date(expense.date || expense.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="ml-3 flex items-center gap-1 text-sm font-semibold text-surface-800 dark:text-slate-100">
                    <ArrowUpRight size={14} className="text-primary-600" />
                    {formatCurrency(expense.amount)}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-surface-300 dark:border-slate-600 p-6 text-center">
                <HandCoins className="mx-auto mb-2 text-surface-400 dark:text-slate-500" size={18} />
                <p className="text-sm text-surface-600 dark:text-slate-300">No recent expenses found.</p>
              </div>
            )}
          </div>
        </Card>
      </section>

      <JoinGroupModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onJoin={handleJoinByCode}
      />
    </div>
  )
}
