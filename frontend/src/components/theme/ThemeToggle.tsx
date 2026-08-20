import { useTranslation } from 'react-i18next'

import { useTheme } from '@/components/theme/ThemeProvider'
import { cn } from '@/lib/cn'

/** Кнопка-переключатель темы (светлая/тёмная) в стиле стекла. */
export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={t(isDark ? 'theme.toggleToLight' : 'theme.toggleToDark')}
      title={t(isDark ? 'theme.toggleToLight' : 'theme.toggleToDark')}
      className={cn(
        'glass-chip pressable grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-600',
        'transition-colors hover:text-brand-600 dark:text-ink-300 dark:hover:text-brand-400',
        className,
      )}
    >
      {isDark ? (
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  )
}