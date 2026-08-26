import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { SettingsGroup, SettingsRow } from '@/components/ui/Settings'
import { Logo } from '@/components/ui/Logo'
import { setLanguage } from '@/i18n'
import { useAuth } from '@/features/auth/AuthContext'
import { notifyError } from '@/features/auth/errors'
import { createTelegramLinkToken } from '@/features/auth/api'
import { openTelegramLink } from '@/lib/telegram'
import { wipeAllData } from '@/features/settings/api'
import { fetchCategories } from '@/features/categories/api'
import { useTheme, type Theme } from '@/components/theme/ThemeProvider'
import { useLock } from '@/features/lock/LockContext'
import { displayInitials, formatMonthYear } from '@/lib/format'
import { cn } from '@/lib/cn'

const icon = {
  user: (
    <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0' />
    </svg>
  ),
  palette: (
    <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
      <circle cx='13.5' cy='6.5' r='1.5' />
      <circle cx='17.5' cy='10.5' r='1.5' />
      <circle cx='8.5' cy='7.5' r='1.5' />
      <circle cx='6.5' cy='12.5' r='1.5' />
      <path d='M12 2a10 10 0 0 0 0 20c1.2 0 1.8-.8 1.8-1.6 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.6 1.8-1.6h2.4A4.6 4.6 0 0 0 22 11.8C22 6.4 17.5 2 12 2z' />
    </svg>
  ),
  tags: (
    <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M20 12.5 12.5 20 4 11.5V4h7.5zM8.5 8.5h.01' />
    </svg>
  ),
  shield: (
    <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M12 2 4 5v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V5z' />
    </svg>
  ),
  lock: (
    <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
      <rect x='5' y='11' width='14' height='9' rx='2' />
      <path d='M8 11V8a4 4 0 0 1 8 0v3' />
    </svg>
  ),
  fingerprint: (
    <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M12 11a2 2 0 0 0-2 2v3M7 13a5 5 0 0 1 .5-2.2M12 7a6 6 0 0 0-6 6v3M17 13a5 5 0 0 0-1-3M12 14v3' />
    </svg>
  ),
  telegram: (
    <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M21 4 3 11l5 2 2 6 3-4 5 4zM21 4l-9 8' />
    </svg>
  ),
  logout: (
    <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9' />
    </svg>
  ),
  trash: (
    <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6' />
    </svg>
  ),
}

function Segment<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div className='inline-flex rounded-xl bg-ink-100 p-0.5 dark:bg-white/10'>
      {options.map((o) => (
        <button
          key={o.value}
          type='button'
          onClick={() => onChange(o.value)}
          className={cn(
            'pressable rounded-lg px-3 py-1 text-xs font-bold transition-colors',
            value === o.value
              ? 'bg-white text-brand-600 shadow-soft dark:bg-brand-500/20 dark:text-brand-300'
              : 'text-ink-400 hover:text-ink-700 dark:hover:text-ink-200',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Switch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type='button'
      role='switch'
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'pressable relative h-7 w-12 shrink-0 rounded-full transition-colors',
        checked ? 'bg-gradient-to-br from-brand-500 to-brand-600' : 'bg-ink-200 dark:bg-white/15',
      )}
    >
      <span
        className={cn(
          'absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all',
          checked ? 'left-6' : 'left-1',
        )}
      />
    </button>
  )
}

export function ProfilePage() {
  const { t, i18n } = useTranslation()
  const { user, updateProfile, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const { pinSet, biometricSupported, biometricEnabled, enableBiometric, disableBiometric } = useLock()
  const toast = useToast()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState(user?.display_name ?? '')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [linking, setLinking] = useState(false)

  const queryClient = useQueryClient()
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: fetchCategories })

  const memberSince = user?.created_at ? formatMonthYear(user.created_at) : ''
  const statsLoading = categoriesQuery.isPending

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
      /* локально уже применили */
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

  const handleLinkTelegram = async () => {
    setLinking(true)
    try {
      const data = await createTelegramLinkToken()
      if (data.bot_deep_link) openTelegramLink(data.bot_deep_link)
      else if (data.webapp_url) openTelegramLink(`${data.webapp_url}?link_token=${data.link_token}`)
    } catch {
      toast.show(t('telegram.linkError'), 'error')
    } finally {
      setLinking(false)
    }
  }

  const wipeMutation = useMutation({
    mutationFn: wipeAllData,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.show(t('settings.wipeSuccess'), 'success')
      navigate('/', { replace: true })
    },
    onError: () => toast.show(t('settings.wipeError'), 'error'),
  })

  const initials = displayInitials(user?.display_name ?? '')

  return (
    <AppShell>
      <div className='space-y-4'>
        {/* Герой */}
        <div className='glass-card flex items-center gap-3.5 p-4 animate-fade-in'>
          <span className='grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 p-[3px] shadow-lifted'>
            <span className='grid h-full w-full place-items-center rounded-full bg-white/90 text-lg font-bold text-brand-600 dark:bg-ink-900/90 dark:text-brand-300'>
              {initials}
            </span>
          </span>
          <div className='min-w-0'>
            <p className='truncate text-lg font-bold tracking-tight text-ink-900 dark:text-ink-50'>
              {user?.display_name}
            </p>
            <p className='truncate text-sm text-ink-400'>{user?.email}</p>
            {memberSince ? (
              <p className='mt-0.5 text-xs text-ink-300 dark:text-ink-500'>
                {t('profile.memberSince', { date: memberSince })}
              </p>
            ) : null}
          </div>
        </div>

        {/* Аккаунт */}
        <SettingsGroup title={t('profile.sectionAccount')}>
          <div className='px-3.5 py-3'>
            <Input
              label={t('profile.displayName')}
              name='display_name'
              autoComplete='name'
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              error={fieldErrors.display_name}
            />
            <div className='mt-2.5 flex justify-end'>
              <Button type='submit' size='sm' loading={saving} onClick={handleSave}>
                {t('common.save')}
              </Button>
            </div>
          </div>
          <SettingsRow
            icon={icon.user}
            label={t('profile.email')}
            hint={user?.email}
          />
        </SettingsGroup>

        {/* Оформление */}
        <SettingsGroup title={t('profile.sectionAppearance')}>
          <SettingsRow
            icon={icon.palette}
            label={t('profile.theme')}
            control={
              <Segment<Theme>
                value={theme}
                onChange={setTheme}
                options={[
                  { value: 'light', label: t('profile.themeLight') },
                  { value: 'dark', label: t('profile.themeDark') },
                ]}
              />
            }
          />
          <SettingsRow
            icon={icon.tags}
            label={t('profile.language')}
            control={
              <Segment<string>
                value={i18n.language.startsWith('en') ? 'en' : 'ru'}
                onChange={(v) => changeLocale(v as 'ru' | 'en')}
                options={[
                  { value: 'ru', label: 'RU' },
                  { value: 'en', label: 'EN' },
                ]}
              />
            }
          />
        </SettingsGroup>

        {/* Безопасность */}
        <SettingsGroup title={t('lock.section')}>
          <SettingsRow
            icon={icon.lock}
            label={t('lock.openSettings')}
            hint={pinSet ? t('lock.statusOn') : t('lock.statusOff')}
            chevron
            to='/lock/setup'
          />
          {biometricSupported && pinSet ? (
            <SettingsRow
              icon={icon.fingerprint}
              label={t('lock.biometric')}
              hint={t('lock.biometricHint')}
              control={
                <Switch
                  checked={biometricEnabled}
                  disabled={linking}
                  onChange={async (next) => {
                    try {
                      if (next) await enableBiometric()
                      else disableBiometric()
                    } catch {
                      toast.show(t('lock.biometricFailed'), 'error')
                    }
                  }}
                />
              }
            />
          ) : null}
        </SettingsGroup>

        {/* Приложение */}
        <SettingsGroup title={t('profile.sectionApp')}>
          <SettingsRow
            icon={icon.telegram}
            label={t('telegram.section')}
            hint={user?.telegram_username ? `@${user.telegram_username}` : t('telegram.linkSub')}
            control={
              user?.telegram_username ? undefined : (
                <Button size='sm' variant='outline' loading={linking} onClick={handleLinkTelegram} className='border-brand-200 text-brand-600 dark:border-brand-400/30 dark:text-brand-300'>
                  {t('telegram.linkTitle')}
                </Button>
              )
            }
          />
          <SettingsRow
            icon={icon.tags}
            label={t('nav.categories')}
            hint={statsLoading ? undefined : t('categories.manageHint')}
            chevron
            to='/categories'
          />
        </SettingsGroup>

        {/* Опасная зона */}
        <SettingsGroup title={t('settings.dangerZone')}>
          <SettingsRow icon={icon.logout} label={t('profile.logout')} danger onClick={handleLogout} disabled={signingOut} />
          <SettingsRow
            icon={icon.trash}
            label={t('settings.wipeButton')}
            hint={t('settings.wipeWarning')}
            danger
            onClick={() => {
              if (window.confirm(t('settings.wipeConfirm'))) wipeMutation.mutate()
            }}
          />
        </SettingsGroup>

        <div className='px-2 pb-2 text-center'>
          <Logo size={22} variant='mark' className='mx-auto mb-1 text-brand-500' />
          <p className='text-xs text-ink-300 dark:text-ink-600'>Keep Coin · v0.1.0</p>
        </div>
      </div>
    </AppShell>
  )
}
