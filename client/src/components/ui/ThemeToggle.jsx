import { Moon, Sun } from 'lucide-react'
import useThemeStore from '../../store/themeStore'

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useThemeStore()

  return (
    <button
      onClick={toggleTheme}
      className={`relative flex h-9 w-9 items-center justify-center rounded-xl border border-surface-200 bg-surface-50 text-surface-600 transition hover:bg-surface-100 hover:text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700 dark:hover:text-white ${className}`}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle theme"
      id="theme-toggle-btn"
    >
      {theme === 'dark' ? (
        <Sun size={18} className="text-amber-400" />
      ) : (
        <Moon size={18} />
      )}
    </button>
  )
}
