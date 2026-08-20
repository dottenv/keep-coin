import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'

import { LanguageToggle } from '@/components/lang/LanguageToggle'
import { useAuth } from '@/features/auth/AuthContext'
import { displayInitials } from '@/lib/format'
import { BottomNav } from './BottomNav'
import { GlassBackground } from './GlassBackground'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

/** Каркас авторизованной части приложения: фон, шапка, контент и нижняя навигация. */
export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const { user } = useAuth()

  return (
    <div className="relative min-h-dvh">
      <GlassBackground />

      <div className="relative z-10 mx-auto w-full max-w-2xl px-4 pb-32 pt-5 sm:px-6">
        <header className="flex min-w-0 items-center gap-3 animate-fade-in">
          <Link to="/" className="flex min-w-0 shrink-0 items-center gap-3" title={t('common.appName')}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-soft">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                <circle
                  cx="12"
                  cy="12"
                  r="8.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="3.5 8"
                  strokeLinecap="round"
                />
                <path d="M12 5.5 v4.5 h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            {user ? (
              <span className="hidden text-sm font-semibold text-ink-400 dark:text-ink-400 sm:inline">
                {t('common.appName')}
              </span>
            ) : null}
          </Link>

          {/* Имя пользователя → настройки профиля */}
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            <ThemeToggle />
            <Link
              to="/profile"
              className="glass-chip pressable flex min-w-0 flex-1 max-w-44 items-center gap-2 rounded-full p-1.5 pl-2 transition-colors hover:border-brand-300 hover:bg-brand-50/60 sm:max-w-56 dark:hover:border-brand-400/40 dark:hover:bg-brand-500/10"
            >
              {user?.display_name ? (
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-[0.65rem] font-bold text-white">
                  {displayInitials(user.display_name)}
                </span>
              ) : null}
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-800 dark:text-ink-200">
                {user?.display_name ?? ''}
              </span>
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 shrink-0 text-ink-300 dark:text-ink-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>
            <div className="hidden shrink-0 sm:block">
              <LanguageToggle />
            </div>
          </div>
        </header>

        <main className="mt-6">{children}</main>

        <BottomNav />
      </div>
    </div>
  )
}