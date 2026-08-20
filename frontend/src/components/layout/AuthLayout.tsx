import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'

import { LanguageToggle } from '@/components/lang/LanguageToggle'
import { GlassBackground } from '@/components/layout/GlassBackground'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

/** Экран-ракушка для страниц авторизации: стеклянный фон + карточка. */
export function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation()

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink-50 dark:bg-ink-950">
      <GlassBackground />

      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        <ThemeToggle />
        <LanguageToggle />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6 py-10">
        <Link
          to="/"
          className="mb-8 flex items-center gap-3 text-ink-900 animate-fade-in-up dark:text-white"
        >
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-lifted">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none">
              <circle
                cx="12"
                cy="12"
                r="8.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="3.5 8"
                strokeLinecap="round"
              />
              <path
                d="M12 5.5 v4.5 h3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="text-xl font-bold tracking-tight">{t('common.appName')}</span>
        </Link>

        <div className="w-full animate-fade-in-up" style={{ animationDelay: '80ms' }}>
          {children}
        </div>
      </div>
    </div>
  )
}