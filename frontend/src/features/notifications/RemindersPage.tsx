import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { notifyError } from '@/features/auth/errors'
import { cn } from '@/lib/cn'
import {
  deleteReminder,
  fetchReminders,
  sendReminderNow,
  updateReminder,
  type Reminder,
} from '@/features/planner/api'
import { formatMonthYear } from '@/lib/format'

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

const TYPE_LABEL: Record<string, string> = {
  generic: 'reminders.typeGeneric',
  budget: 'reminders.typeBudget',
  goal: 'reminders.typeGoal',
  credit: 'reminders.typeCredit',
}

export function RemindersPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()

  const reminders = useQuery({ queryKey: ['reminders'], queryFn: fetchReminders })

  const toggle = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      updateReminder(id, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders'] }),
    onError: (e) => notifyError(e, toast),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteReminder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
      toast.show(t('reminders.deleted'), 'success')
    },
    onError: (e) => notifyError(e, toast),
  })

  const sendNow = useMutation({
    mutationFn: (id: string) => sendReminderNow(id),
    onSuccess: () => toast.show(t('reminders.sent'), 'success'),
    onError: (e) => notifyError(e, toast),
  })

  const list = reminders.data ?? []

  return (
    <AppShell>
      <PageHeader
        title={t('reminders.title')}
        action={
          <Button size='sm' onClick={() => navigate('/reminders/new')}>
            {t('common.add')}
          </Button>
        }
      />

      {reminders.isPending ? (
        <Card className='p-5'>{t('common.loading')}</Card>
      ) : list.length === 0 ? (
        <Card className='p-6 text-center text-sm text-ink-400'>{t('reminders.empty')}</Card>
      ) : (
        <div className='space-y-3'>
          {list.map((r: Reminder) => (
            <Card key={r.id} className='animate-fade-in-up p-4'>
              <div className='flex items-start justify-between gap-2'>
                <button
                  type='button'
                  className='min-w-0 flex-1 text-left'
                  onClick={() => navigate(`/reminders/${r.id}/edit`)}
                >
                  <p className='font-bold text-ink-900 dark:text-ink-50'>{r.title}</p>
                  <p className='truncate text-xs text-ink-400'>{r.body || TYPE_LABEL[r.type]}</p>
                  <p className='mt-1 text-xs text-ink-500 dark:text-ink-400'>
                    {t(TYPE_LABEL[r.type] ?? 'reminders.typeGeneric')} ·{' '}
                    {formatMonthYear(r.due_at, i18n.language)}
                    {r.recurrence !== 'none' ? ` · ${t(`reminders.recurrence.${r.recurrence}`)}` : ''}
                  </p>
                </button>
                <Switch
                  checked={r.enabled}
                  onChange={(next) => toggle.mutate({ id: r.id, enabled: next })}
                />
              </div>
              <div className='mt-2 flex gap-2'>
                <button
                  type='button'
                  className='pressable rounded-lg bg-brand-500/10 px-2.5 py-1 text-xs font-semibold text-brand-600 dark:text-brand-300'
                  onClick={() => sendNow.mutate(r.id)}
                >
                  {t('reminders.sendNow')}
                </button>
                <button
                  type='button'
                  className='pressable rounded-lg bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-500'
                  onClick={() => {
                    if (window.confirm(t('reminders.confirmDelete'))) remove.mutate(r.id)
                  }}
                >
                  {t('common.delete')}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  )
}
