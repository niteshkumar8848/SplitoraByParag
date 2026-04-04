import { create } from 'zustand'

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem('splitora_theme')
  if (stored) return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const applyTheme = (theme) => {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
  localStorage.setItem('splitora_theme', theme)
}

const useThemeStore = create((set) => ({
  theme: getInitialTheme(),
  toggleTheme: () =>
    set((state) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light'
      applyTheme(newTheme)
      return { theme: newTheme }
    }),
  setTheme: (theme) => {
    applyTheme(theme)
    set({ theme })
  }
}))

// Apply saved theme immediately on module load (before React renders)
applyTheme(getInitialTheme())

export default useThemeStore
