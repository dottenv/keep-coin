import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { errorMessage } from '@/features/auth/errors'
import { acceptInvite, declineInvite, fetchPendingInvites } from '@/features/accounts/api'
import { formatShortDate } from '@/lib/format'
import { cn } from '@/lib/cn'

/** Экран «Приглашения»: принятие/отклонение приглашений на общие счета. */
export function InvitesPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()

  const invites = useQuery({ queryKey: ['invites'], queryFn: fetchPendingInvites })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['invites'] })
    queryClient.invalidateQueries({ queryKey: ['accounts'] })
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
  }

  const acceptMutation = useMutation({
    mutationFn: acceptInvite,
    onSuccess: () => {
      invalidate()
      toast.show(t('invites.accepted'), 'success')
    },
    onError: (error) => toast.show(errorMessage(error), 'error'),
  })

  const declineMutation = useMutation({
    mutationFn: declineInvite,
    onSuccess: () => {
      invalidate()
      toast.show(t('invites.declined'), 'success')
    },
    onError: (error) => toast.show(errorMessage(error), 'error'),
  })

  return (
    <AppShell>
      <PageHeader title={t('invites.title')} />

      {invites.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-[1.5rem]" />
          <Skeleton className="h-20 rounded-[1.5rem]" />
        </div>
      ) : invites.data && invites.data.length === 0 ? (
        <Card className="p-10 text-center animate-fade-in">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-300">
            <svg
              viewBox="0 0 24 24"
              className="h-7 w-7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 4h16v12H4zM4 7l8 5 8-5" />
            </svg>
          </span>
          <p className="mt-4 text-sm font-medium text-ink-700 dark:text-ink-200">{t('invites.empty')}</p>
          <p className="mt-1 text-xs text-ink-400">{t('invites.emptySub')}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {invites.data?.map((invite, index) => (
            <Card
              key={invite.id}
              className="p-5 animate-fade-in-up"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-white">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 7h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM3 10h18" />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-800 dark:text-ink-100">
                    {invite.scope === 'family'
                      ? t('invites.familyScope')
                      : t('invites.toAccount', { name: invite.account_name })}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-ink-400">
                    {t('invites.from', { name: invite.inviter_name })} ·{' '}
                    {formatShortDate(invite.created_at)}
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-full bg-ink-100 px-2.5 py-1 text-[0.65rem] font-bold text-ink-600 dark:bg-white/10 dark:text-ink-300',
                  )}
                >
                  {t(`roles.${invite.role}`)}
                </span>
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  loading={acceptMutation.isPending}
                  onClick={() => acceptMutation.mutate(invite.id)}
                >
                  {t('invites.accept')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  loading={declineMutation.isPending}
                  onClick={() => declineMutation.mutate(invite.id)}
                >
                  {t('invites.decline')}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  )
}