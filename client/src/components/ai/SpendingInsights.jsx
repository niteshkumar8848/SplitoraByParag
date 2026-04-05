import { AlertTriangle, Lightbulb, TrendingUp } from 'lucide-react'
import { useSpendingInsights } from '../../hooks/useAI'
import Card from '../ui/Card'

const iconMap = {
  info: { Icon: Lightbulb, className: 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/40' },
  warning: { Icon: AlertTriangle, className: 'text-warning-600 dark:text-warning-400 bg-warning-50 dark:bg-warning-900/30' },
  success: { Icon: TrendingUp, className: 'text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-900/30' }
}

export default function SpendingInsights() {
  const { data, isLoading } = useSpendingInsights()
  const insights = data?.data?.insights || []
  if (isLoading) return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {[1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface-200 dark:bg-dark-50" />)}
    </div>
  )
  if (!insights.length) return null
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-surface-900 dark:text-white">AI Insights</h2>
        <span className="inline-flex items-center rounded-full bg-primary-100 dark:bg-primary-900/40 px-2 py-0.5 text-xs font-medium text-primary-700 dark:text-primary-300">✨ AI</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {insights.map((insight, i) => {
          const { Icon, className } = iconMap[insight.type] || iconMap.info
          return (
            <Card key={i}>
              <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-xl ${className}`}>
                <Icon size={16} />
              </div>
              <p className="text-sm font-semibold text-surface-900 dark:text-white">{insight.title}</p>
              <p className="mt-1 text-xs text-surface-600 dark:text-slate-300">{insight.insight}</p>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
