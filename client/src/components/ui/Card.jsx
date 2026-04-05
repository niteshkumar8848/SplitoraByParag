import clsx from 'clsx'
import { twMerge } from 'tailwind-merge'

export default function Card({ className, hover = false, children, ...props }) {
  return (
    <div
      className={twMerge(
        clsx(
          'rounded-2xl border border-surface-200 dark:border-dark-50 bg-surface-50 dark:bg-dark-100 p-5 shadow-card dark:shadow-dark-card transition-all text-surface-900 dark:text-slate-100',
          hover && 'hover:-translate-y-0.5 hover:shadow-modal cursor-pointer'
        ),
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
