import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { useTheme } from '@/components/theme/ThemeProvider'
import { cn } from '@/lib/cn'
import type { Theme } from '@/components/theme/ThemeProvider'

const OPTIONS: { value: Theme; labelKey: string; icon: ReactNode }[] = [
  {
    value: 'light',
    labelKey: 'theme.light',
    icon: (
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    ),
  },
  {
    value: 'dark',
    labelKey: 'theme.dark',
    icon: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </>
    ),
  },
]

/** Переключатель темы: светлая / тёмная (сегментированный контрол). */
export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()

  return (
    <div
      role="group"
      aria-label={t('theme.title')}
      className={cn(
        'glass-chip flex items-center gap-0.5 rounded-full p-1',
        className,
      )}
    >
      {OPTIONS.map((opt) => {
        const active = theme === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            aria-label={t(opt.labelKey)}
            aria-pressed={active}
            title={t(opt.labelKey)}
            className={cn(
              'pressable grid h-8 w-8 place-items-center rounded-full transition-colors',
              active
                ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-soft'
                : 'text-ink-500 hover:text-brand-600 dark:text-ink-300 dark:hover:text-brand-300',
            )}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {opt.icon}
            </svg>
          </button>
        )
      })}
    </div>
  )
}
