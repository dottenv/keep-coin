import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { setLanguage } from '@/i18n'
import { useAuth } from '@/features/auth/AuthContext'
import { notifyError } from '@/features/auth/errors'
import { wipeAllData } from '@/features/settings/api'
import { fetchAccounts } from '@/features/accounts/api'
import { fetchCategories } from '@/features/categories/api'
import { CategoryManager } from '@/features/categories/components/CategoryManager'
import { useTheme, type Theme } from '@/components/theme/ThemeProvider'
import { displayInitials, formatMonthYear } from '@/lib/format'
import { cn } from '@/lib/cn'

/** Заголовок секции с цветной иконкой. */
function SectionTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center gap-2.5 px-1">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
        {icon}
      </span>
      <h2 className="text-sm font-bold text-ink-700 dark:text-ink-200">{children}</h2>
    </div>
  )
}

const smallIcon = {
  user: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" />
    </svg>
  ),
  mail: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16v12H4zM4 7l8 5 8-5" />
    </svg>
  ),
  palette: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r="1.5" />
      <circle cx="17.5" cy="10.5" r="1.5" />
      <circle cx="8.5" cy="7.5" r="1.5" />
      <circle cx="6.5" cy="12.5" r="1.5" />
      <path d="M12 2a10 10 0 0 0 0 20c1.2 0 1.8-.8 1.8-1.6 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.6 1.8-1.6h2.4A4.6 4.6 0 0 0 22 11.8C22 6.4 17.5 2 12 2z" />
    </svg>
  ),
  tags: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 12.5 12.5 20 4 11.5V4h7.5zM8.5 8.5h.01" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 4 5v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V5z" />
    </svg>
  ),
}

/** Карточка выбора темы с мини-превью поверхности. */
function ThemeOption({
  theme,
  active,
  onSelect,
  label,
}: {
  theme: Theme
  active: boolean
  onSelect: () => void
  label: string
}) {
  const isDark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'pressable relative flex-1 rounded-2xl border p-3 text-left transition-all',
        'border-ink-200/70 bg-white/50 backdrop-blur-lg',
        'dark:border-white/10 dark:bg-white/[0.05]',
        active
          ? 'ring-2 ring-brand-500/70 dark:ring-brand-400/70'
          : 'opacity-70 hover:opacity-100',
      )}
      aria-pressed={active}
    >
      <span
        className={cn(
          'block rounded-xl border px-3 pb-5 pt-2',
          isDark
            ? 'border-white/10 bg-ink-900'
            : 'border-ink-100 bg-ink-50',
        )}
      >
        <span className="flex items-center gap-1.5">
          <span className="h-4 w-4 rounded-full bg-gradient-to-br from-brand-400 to-brand-600" />
          <span
            className={cn(
              'h-1.5 w-3/4 rounded-full',
              isDark ? 'bg-white/25' : 'bg-ink-300',
            )}
          />
        </span>
        <span
          className={cn(
            'mt-2 block h-2.5 w-full rounded-md',
            isDark ? 'bg-white/10' : 'bg-white/70',
          )}
        />
      </span>
      <span className="mt-2.5 block text-xs font-bold text-ink-700 dark:text-ink-200">
        {label}
      </span>
      {active ? (
        <span className="absolute right-2.5 top-2.5 grid h-5 w-5 place-items-center rounded-full bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-soft">
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </span>
      ) : null}
    </button>
  )
}

export function ProfilePage() {
  const { t, i18n } = useTranslation()
  const { user, updateProfile, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const toast = useToast()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState(user?.display_name ?? '')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const queryClient = useQueryClient()

  const accountsQuery = useQuery({ queryKey: ['accounts'], queryFn: fetchAccounts })
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: fetchCategories })

  const memberSince = user?.created_at ? formatMonthYear(user.created_at) : ''
  const statsLoading = accountsQuery.isPending || categoriesQuery.isPending

  const handleSave = async (event: FormEvent) => {
    event.preventDefault()
    setFieldErrors({})
    setSaving(true)
    try {
      const result = await updateProfile({ display_name: displayName })
      setLanguage(result.locale)
      toast.show(t('profile.saved'), 'success')
    } catch (error) {
      setFieldErrors(notifyError(error, toast))
    } finally {
      setSaving(false)
    }
  }

  const changeLocale = async (locale: 'ru' | 'en') => {
    setLanguage(locale)
    try {
      await updateProfile({ locale })
    } catch {
      /* не критично — язык уже сменился локально */
    }
  }

  const handleLogout = async () => {
    setSigningOut(true)
    try {
      await logout()
      navigate('/login', { replace: true })
    } finally {
      setSigningOut(false)
    }
  }

  const wipeMutation = useMutation({
    mutationFn: wipeAllData,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['transactions', 'recent'] })
      queryClient.invalidateQueries({ queryKey: ['transactions', 'all'] })

      toast.show(t('settings.wipeSuccess'), 'success')
      navigate('/', { replace: true })
    },
    onError: (error) => {
      toast.show(t('settings.wipeError'), 'error')
      console.error('Failed to wipe data:', error)
    },
  })

  const handleWipeAllData = () => {
    if (window.confirm(t('settings.wipeConfirm'))) {
      wipeMutation.mutate()
    }
  }

  const initials = displayInitials(user?.display_name ?? '')

  return (
    <AppShell>
      <div className="space-y-5">
        {/* ── Hero-карточка ─────────────────────────────────────────── */}
        <div className="glass-card relative overflow-hidden p-6 animate-fade-in">
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-brand-400/20 blur-2xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-emerald-300/20 blur-2xl" />

          <div className="relative flex items-center gap-4">
            <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 p-[3px] shadow-lifted">
              <span className="grid h-full w-full place-items-center rounded-full bg-white/90 text-2xl font-bold text-brand-600 dark:bg-ink-900/90 dark:text-brand-300">
                {initials}
              </span>
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold tracking-tight text-ink-900 dark:text-ink-100">
                {user?.display_name}
              </h1>
              <p className="truncate text-sm text-ink-400">{user?.email}</p>
              {memberSince ? (
                <p className="mt-0.5 text-xs text-ink-300 dark:text-ink-500">
                  {t('profile.memberSince', { date: memberSince })}
                </p>
              ) : null}
            </div>
          </div>

          <div className="relative mt-5 grid grid-cols-2 gap-3">
            <div className="glass-chip rounded-2xl p-3.5 text-center">
              {statsLoading ? (
                <Skeleton className="mx-auto h-6 w-10 rounded-md" />
              ) : (
                <p className="text-xl font-bold tabular-nums text-ink-900 dark:text-ink-100">
                  {accountsQuery.data?.length ?? 0}
                </p>
              )}
              <p className="mt-0.5 text-[0.7rem] font-medium text-ink-400">
                {t('profile.statAccounts')}
              </p>
            </div>
            <div className="glass-chip rounded-2xl p-3.5 text-center">
              {statsLoading ? (
                <Skeleton className="mx-auto h-6 w-10 rounded-md" />
              ) : (
                <p className="text-xl font-bold tabular-nums text-ink-900 dark:text-ink-100">
                  {categoriesQuery.data?.length ?? 0}
                </p>
              )}
              <p className="mt-0.5 text-[0.7rem] font-medium text-ink-400">
                {t('profile.statCategories')}
              </p>
            </div>
          </div>
        </div>

        {/* ── Профиль ────────────────────────────────────────────────── */}
        <section className="animate-fade-in-up" style={{ animationDelay: '60ms' }}>
          <SectionTitle icon={smallIcon.user}>{t('profile.sectionProfile')}</SectionTitle>
          <Card className="p-5">
            <form onSubmit={handleSave} className="space-y-4">
              <Input
                label={t('profile.displayName')}
                name="display_name"
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                error={fieldErrors.display_name}
                leftSlot={smallIcon.user}
              />

              <Input
                label={t('profile.email')}
                value={user?.email ?? ''}
                readOnly
                disabled
                leftSlot={smallIcon.mail}
              />

              <Button type="submit" fullWidth loading={saving}>
                {t('common.save')}
              </Button>
            </form>
          </Card>
        </section>

        {/* ── Оформление ─────────────────────────────────────────────── */}
        <section className="animate-fade-in-up" style={{ animationDelay: '120ms' }}>
          <SectionTitle icon={smallIcon.palette}>{t('profile.sectionAppearance')}</SectionTitle>
          <Card className="space-y-5 p-5">
            <div>
              <p className="mb-2 text-sm font-medium text-ink-600 dark:text-ink-300">
                {t('profile.appearance')}
              </p>
              <p className="mb-3 text-xs text-ink-400">{t('profile.appearanceHint')}</p>
              <div className="flex gap-3">
                <ThemeOption
                  theme="light"
                  active={theme === 'light'}
                  onSelect={() => setTheme('light')}
                  label={t('profile.themeLight')}
                />
                <ThemeOption
                  theme="dark"
                  active={theme === 'dark'}
                  onSelect={() => setTheme('dark')}
                  label={t('profile.themeDark')}
                />
              </div>
            </div>

            <div className="border-t border-ink-100 pt-5 dark:border-white/10">
              <span className="mb-1.5 block text-sm font-medium text-ink-600 dark:text-ink-300">
                {t('profile.language')}
              </span>
              <div
                className="inline-flex items-center gap-1 rounded-2xl border border-ink-200 bg-white/70 p-1 backdrop-blur-lg dark:border-white/15 dark:bg-white/[0.06]"
                role="group"
                aria-label={t('profile.language')}
              >
                {(
                  [
                    { code: 'ru', label: 'RU' },
                    { code: 'en', label: 'EN' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => changeLocale(opt.code)}
                    className={cn(
                      'pressable rounded-xl px-4 py-1.5 text-xs font-bold transition-colors',
                      i18n.language.startsWith(opt.code)
                        ? 'bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-soft'
                        : 'text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-200',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </section>

        {/* ── Категории ──────────────────────────────────────────────── */}
        <section className="animate-fade-in-up" style={{ animationDelay: '180ms' }}>
          <SectionTitle icon={smallIcon.tags}>{t('profile.sectionCategories')}</SectionTitle>
          <Card className="p-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-ink-700 dark:text-ink-200">
                  {t('nav.categories')}
                </h3>
                <span className="text-xs text-ink-400 dark:text-ink-400">
                  {t('categories.manageHint')}
                </span>
              </div>
              <CategoryManager compact />
            </div>
          </Card>
        </section>

        {/* ── Аккаунт ────────────────────────────────────────────────── */}
        <section className="animate-fade-in-up" style={{ animationDelay: '240ms' }}>
          <SectionTitle icon={smallIcon.shield}>{t('profile.sectionAccount')}</SectionTitle>

          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              fullWidth
              loading={signingOut}
              onClick={handleLogout}
              className="border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 dark:border-red-400/30 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              {t('profile.logout')}
            </Button>

            {/* Опасная зона */}
            <div className="rounded-2xl border border-red-200/70 bg-red-50/70 p-4 backdrop-blur-lg dark:border-red-400/20 dark:bg-red-500/10">
              <h3 className="mb-1.5 text-sm font-semibold text-red-800 dark:text-red-300">
                {t('settings.dangerZone')}
              </h3>
              <p className="mb-3 text-xs text-red-600 dark:text-red-400">
                {t('settings.wipeWarning')}
              </p>
              <Button
                type="button"
                variant="danger"
                fullWidth
                loading={wipeMutation.isPending}
                onClick={handleWipeAllData}
                className="border border-red-300 bg-white/80 text-red-600 backdrop-blur hover:border-red-400 hover:bg-red-50 disabled:border-red-200 disabled:bg-red-100 disabled:text-red-400 dark:border-red-400/30 dark:bg-white/[0.04] dark:text-red-300 dark:hover:bg-red-500/10"
              >
                {t('settings.wipeButton')}
              </Button>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  )
}