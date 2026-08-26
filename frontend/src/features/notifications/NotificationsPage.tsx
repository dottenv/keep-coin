import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Input'
import { SettingsGroup, SettingsRow } from '@/components/ui/Settings'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { fetchUserTimezone, saveUserTimezone } from '@/features/planner/api'
import {
  getExistingSubscription,
  isPushSupported,
  notificationPermission,
  sendTestPush,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/notifications'

const COMMON_TZ = [
  'UTC',
  'Europe/Moscow',
  'Europe/Kiev',
  'Europe/Minsk',
  'Europe/Berlin',
  'Asia/Almaty',
  'Asia/Tashkent',
  'Asia/Yekaterinburg',
  'Asia/Novosibirsk',
  'Asia/Vladivostok',
  'Asia/Kamchatka',
  'America/New_York',
  'America/Los_Angeles',
]

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type='button'
      role='switch'
      aria-checked={checked}
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

export function NotificationsPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()

  const tzQuery = useQuery({ queryKey: ['timezone'], queryFn: fetchUserTimezone })

  const [supported] = useState(isPushSupported())
  const [perm, setPerm] = useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [timezone, setTimezone] = useState('')

  useEffect(() => {
    setPerm(notificationPermission())
    getExistingSubscription()
      .then((sub) => setSubscribed(Boolean(sub)))
      .catch(() => setSubscribed(false))
  }, [])

  useEffect(() => {
    if (!timezone && tzQuery.data) setTimezone(tzQuery.data)
  }, [tzQuery.data, timezone])

  const enable = async () => {
    setBusy(true)
    try {
      const ok = await subscribeToPush()
      setPerm(notificationPermission())
      setSubscribed(ok)
      if (ok) toast.show(t('notifications.enabled'), 'success')
      else toast.show(t('notifications.denied'), 'error')
    } catch {
      toast.show(t('notifications.error'), 'error')
    } finally {
      setBusy(false)
    }
  }

  const disable = async () => {
    setBusy(true)
    try {
      await unsubscribeFromPush()
      setSubscribed(false)
      toast.show(t('notifications.disabled'), 'success')
    } catch {
      toast.show(t('notifications.error'), 'error')
    } finally {
      setBusy(false)
    }
  }

  const test = async () => {
    setBusy(true)
    try {
      const sent = await sendTestPush()
      if (sent > 0) toast.show(t('notifications.testSent'), 'success')
      else toast.show(t('notifications.noSubscription'), 'error')
    } catch {
      toast.show(t('notifications.error'), 'error')
    } finally {
      setBusy(false)
    }
  }

  const saveTz = async (value: string) => {
    setTimezone(value)
    try {
      await saveUserTimezone(value)
      queryClient.invalidateQueries({ queryKey: ['timezone'] })
      toast.show(t('notifications.tzSaved'), 'success')
    } catch {
      toast.show(t('notifications.error'), 'error')
    }
  }

  return (
    <AppShell>
      <PageHeader title={t('notifications.title')} />
      <div className='space-y-4'>
        {!supported ? (
          <Card className='p-4 text-sm text-ink-400'>{t('notifications.unsupported')}</Card>
        ) : (
          <SettingsGroup title={t('notifications.pushGroup')}>
            <SettingsRow
              label={t('notifications.pushStatus')}
              hint={
                subscribed
                  ? t('notifications.subscribed')
                  : perm === 'denied'
                    ? t('notifications.denied')
                    : t('notifications.notSubscribed')
              }
              control={
                subscribed ? (
                  <Button size='sm' variant='outline' loading={busy} onClick={disable}>
                    {t('notifications.disable')}
                  </Button>
                ) : (
                  <Button size='sm' loading={busy} onClick={enable}>
                    {t('notifications.enable')}
                  </Button>
                )
              }
            />
            <SettingsRow
              label={t('notifications.test')}
              hint={t('notifications.testHint')}
              control={
                <Button size='sm' variant='outline' loading={busy} onClick={test}>
                  {t('notifications.sendTest')}
                </Button>
              }
            />
          </SettingsGroup>
        )}

        <SettingsGroup title={t('notifications.timezoneGroup')}>
          <SettingsRow label={t('notifications.timezone')} hint={t('notifications.timezoneHint')}>
            <Select
              value={timezone}
              onChange={(e) => saveTz(e.target.value)}
              className='mt-2 w-full'
            >
              {COMMON_TZ.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </Select>
          </SettingsRow>
        </SettingsGroup>

        <SettingsGroup title={t('notifications.remindersGroup')}>
          <SettingsRow
            label={t('reminders.title')}
            hint={t('reminders.hint')}
            chevron
            to='/reminders'
          />
        </SettingsGroup>
      </div>
    </AppShell>
  )
}
