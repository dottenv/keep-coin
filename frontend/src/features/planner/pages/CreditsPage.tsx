import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { notifyError } from '@/features/auth/errors'
import { deleteCredit, fetchCredits, type Credit } from '@/features/planner/api'
import { formatMonthYear } from '@/lib/format'

function money(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency }).format(n)
  } catch {
    return `${n.toFixed(2)} ${currency}`
  }
}

export function CreditsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()

  const credits = useQuery({ queryKey: ['credits'], queryFn: fetchCredits })

  const remove = useMutation({
    mutationFn: (id: string) => deleteCredit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credits'] })
      queryClient.invalidateQueries({ queryKey: ['planner'] })
      toast.show(t('credits.deleted'), 'success')
    },
    onError: (e) => notifyError(e, toast),
  })

  const list = credits.data ?? []

  return (
    <AppShell>
      <PageHeader
        title={t('nav.credits')}
        action={
          <Button size='sm' onClick={() => navigate('/credits/new')}>
            {t('common.add')}
          </Button>
        }
      />

      {credits.isPending ? (
        <Card className='p-5'>{t('common.loading')}</Card>
      ) : list.length === 0 ? (
        <Card className='p-6 text-center text-sm text-ink-400'>{t('credits.empty')}</Card>
      ) : (
        <div className='space-y-3'>
          {list.map((c: Credit) => (
            <Card key={c.id} className='animate-fade-in-up p-4'>
              <div className='flex items-start justify-between gap-2'>
                <button
                  type='button'
                  className='min-w-0 flex-1 text-left'
                  onClick={() => navigate(`/credits/${c.id}/edit`)}
                >
                  <p className='font-bold text-ink-900 dark:text-ink-50'>{c.name}</p>
                  <p className='mt-0.5 text-xs text-ink-400'>
                    {t('credits.total')}: {money(c.total_amount, c.currency)}
                    {c.interest_rate ? ` · ${c.interest_rate}%` : ''}
                  </p>
                </button>
                <button
                  type='button'
                  aria-label={t('common.delete')}
                  className='pressable grid h-9 w-9 shrink-0 place-items-center rounded-xl text-ink-400 hover:bg-red-500/10 hover:text-red-500'
                  onClick={() => {
                    if (window.confirm(t('credits.confirmDelete'))) remove.mutate(c.id)
                  }}
                >
                  <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                    <path d='M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6' />
                  </svg>
                </button>
              </div>
              <div className='mt-2 flex flex-wrap gap-2 text-xs text-ink-500 dark:text-ink-400'>
                {c.payment_amount ? (
                  <span className='rounded-lg bg-ink-100 px-2 py-1 dark:bg-white/10'>
                    {t('credits.payment')}: {money(c.payment_amount, c.currency)}
                  </span>
                ) : null}
                {c.next_payment_date ? (
                  <span className='rounded-lg bg-ink-100 px-2 py-1 dark:bg-white/10'>
                    {t('credits.nextPayment')}: {formatMonthYear(c.next_payment_date, i18n.language)}
                  </span>
                ) : null}
                {c.account_name ? (
                  <span className='rounded-lg bg-ink-100 px-2 py-1 dark:bg-white/10'>
                    {c.account_name}
                  </span>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}

      {list.length > 0 ? (
        <p className='px-2 pt-2 text-center text-xs text-ink-300 dark:text-ink-600'>
          {t('credits.swipeHint')}
        </p>
      ) : null}
    </AppShell>
  )
}
