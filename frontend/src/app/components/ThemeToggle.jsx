import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../ThemeContext'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Passer au thème clair' : 'Passer au thème sombre'}
      onClick={toggleTheme}
      className="relative inline-flex h-8 w-[3.25rem] shrink-0 items-center rounded-full border border-outline-variant bg-surface-low p-0.5 transition-colors"
    >
      <Sun
        size={14}
        className={`absolute left-1.5 z-10 transition-opacity ${isDark ? 'text-on-surface-variant opacity-40' : 'text-on-surface opacity-100'}`}
      />
      <Moon
        size={14}
        className={`absolute right-1.5 z-10 transition-opacity ${isDark ? 'text-on-surface opacity-100' : 'text-on-surface-variant opacity-40'}`}
      />
      <span
        className={`h-6 w-6 rounded-full bg-primary shadow-sm transition-transform duration-200 ${
          isDark ? 'translate-x-[1.35rem]' : 'translate-x-0'
        }`}
      />
    </button>
  )
}
