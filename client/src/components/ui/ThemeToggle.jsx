import { Moon, Sun } from 'lucide-react'
import useThemeStore from '../../store/themeStore'

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useThemeStore()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      className={`relative flex h-9 w-16 items-center rounded-full border transition-all duration-300 ${
        isDark
          ? 'bg-primary-600 border-primary-500'
          : 'bg-surface-200 border-surface-300'
      } ${className}`}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle theme"
      id="theme-toggle-btn"
    >
      <span
        className={`absolute flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md transition-all duration-300 ${
          isDark ? 'left-8' : 'left-1'
        }`}
      >
        {isDark ? (
          <Moon size={14} className="text-primary-600" />
        ) : (
          <Sun size={14} className="text-amber-500" />
        )}
      </span>
      <Sun size={13} className={`absolute left-2 ${isDark ? 'text-white/40' : 'text-amber-500'}`} />
      <Moon size={13} className={`absolute right-2 ${isDark ? 'text-white' : 'text-surface-400'}`} />
    </button>
  )
}
