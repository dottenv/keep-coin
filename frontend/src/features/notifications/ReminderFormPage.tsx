import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input, Select } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { fetchUserTimezone, updateReminder, createReminder, fetchReminders, type CreateReminderPayload } from '@/features/planner/api'
import { notifyError } from '@/features/auth/errors'

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
  'Asia/Krasnoyarsk',
  'Asia/Irkutsk',
  'Asia/Vladivostok',
  'Asia/Kamchatka',
  'America/New_York',
  'America/Los_Angeles',
]

const TYPES = ['generic', 'budget', 'goal', 'credit'] as const
const RECURRENCES = ['none', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'] as const

export function ReminderFormPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  const tzQuery = useQuery({ queryKey: ['timezone'], queryFn: fetchUserTimezone })
  const reminders = useQuery({ queryKey: ['reminders'], queryFn: fetchReminders })
  const editing = useMemo(() => reminders.data?.find((r) => r.id === id), [reminders.data, id])

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [type, setType] = useState<(typeof TYPES)[number]>('generic')
  const [dueAt, setDueAt] = useState('')
  const [timezone, setTimezone] = useState('')
  const [recurrence, setRecurrence] = useState<(typeof RECURRENCES)[number]>('none')
  const [enabled, setEnabled] = useState(true)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!editing) return
    setTitle(editing.title)
    setBody(editing.body)
    setType(editing.type)
    setDueAt((editing.due_at ?? '').slice(0, 16))
    setTimezone(editing.timezone)
    setRecurrence(editing.recurrence)
    setEnabled(editing.enabled)
  }, [editing])

  useEffect(() => {
    if (!timezone && tzQuery.data) setTimezone(tzQuery.data)
  }, [tzQuery.data, timezone])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['reminders'] })

  const persist = useMutation({
    mutationFn: (data: CreateReminderPayload) =>
      isEdit ? updateReminder(id!, data) : createReminder(data),
    onSuccess: () => {
      invalidate()
      toast.show(isEdit ? t('reminders.updated') : t('reminders.saved'), 'success')
      navigate('/reminders', { replace: true })
    },
    onError: (e) => setFieldErrors(notifyError(e, toast) as Record<string, string>),
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    if (title.trim().length === 0) {
      setFieldErrors({ title: t('errors.reminder_title_required') })
      return
    }
    if (!dueAt) {
      setFieldErrors({ due_at: t('errors.reminder_due_required') })
      return
    }
    persist.mutate({
      title: title.trim(),
      body: body.trim(),
      type,
      due_at: dueAt,
      timezone: timezone || 'UTC',
      recurrence,
      enabled,
    })
  }

  const loading = isEdit && reminders.isPending

  return (
    <AppShell>
      <PageHeader title={t(isEdit ? 'reminders.editTitle' : 'reminders.newTitle')} />
      {loading ? (
        <Card className='p-5'>{t('common.loading')}</Card>
      ) : (
        <Card className='p-5 animate-fade-in-up'>
          <form onSubmit={handleSubmit} className='space-y-4'>
            <Input
              label={t('reminders.titleField')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              error={fieldErrors.title}
              autoFocus
            />
            <Input
              label={t('reminders.bodyField')}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <Select label={t('reminders.typeField')} value={type} onChange={(e) => setType(e.target.value as (typeof TYPES)[number])}>
              {TYPES.map((tp) => (
                <option key={tp} value={tp}>
                  {t(`reminders.type${tp[0].toUpperCase()}${tp.slice(1)}`)}
                </option>
              ))}
            </Select>
            <Input
              label={t('reminders.dueField')}
              type='datetime-local'
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              error={fieldErrors.due_at}
            />
            <Select label={t('reminders.timezoneField')} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              {COMMON_TZ.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </Select>
            <Select
              label={t('reminders.recurrenceField')}
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as (typeof RECURRENCES)[number])}
            >
              {RECURRENCES.map((rc) => (
                <option key={rc} value={rc}>
                  {t(`reminders.recurrence.${rc}`)}
                </option>
              ))}
            </Select>
            <label className='flex items-center justify-between'>
              <span className='text-sm font-medium text-ink-600 dark:text-ink-300'>
                {t('reminders.enabledField')}
              </span>
              <button
                type='button'
                role='switch'
                aria-checked={enabled}
                onClick={() => setEnabled((v) => !v)}
                className={
                  'pressable relative h-7 w-12 shrink-0 rounded-full transition-colors ' +
                  (enabled ? 'bg-gradient-to-br from-brand-500 to-brand-600' : 'bg-ink-200 dark:bg-white/15')
                }
              >
                <span
                  className={
                    'absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ' +
                    (enabled ? 'left-6' : 'left-1')
                  }
                />
              </button>
            </label>

            <Button type='submit' fullWidth loading={persist.isPending}>
              {t('common.save')}
            </Button>
          </form>
        </Card>
      )}
    </AppShell>
  )
}
