import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import {
  fetchAccounts,
  fetchPendingInvites,
  type Account,
} from '@/features/accounts/api'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/cn'

const TYPE_ICONS: Record<Account['type'], string> = {
  cash: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  card: 'M3 6h18v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM3 10h18',
  wallet: 'M20 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a3 3 0 0 0 3 3h13a2 2 0 0 0 2-2zM3 7h18',
  saving: 'M12 2v20M2 12h20M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4',
}

const TYPE_TONES: Record<Account['type'], string> = {
  cash: 'bg-ink-100 text-ink-600 dark:bg-white/10 dark:text-ink-300',
  card: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400',
  wallet: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
  saving: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
}

/** Страница «Счета»: все счета с балансами, общие счета и приглашения. */
export function AccountsPage() {
  const { t } = useTranslation()
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: fetchAccounts })
  const invites = useQuery({ queryKey: ['invites'], queryFn: fetchPendingInvites })

  const pendingCount = invites.data?.length ?? 0

  return (
    <AppShell>
      <PageHeader
        title={t('nav.accounts')}
        action={
          <div className="flex items-center gap-2">
            {pendingCount > 0 ? (
              <Link
                to="/invites"
                className="pressable relative grid h-10 w-10 place-items-center rounded-full border border-amber-200 bg-amber-50 text-amber-600 shadow-soft dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-400"
                aria-label={t('invites.title')}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 4h16v12H4zM4 7l8 5 8-5" />
                </svg>
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[0.6rem] font-bold text-white">
                  {pendingCount}
                </span>
              </Link>
            ) : null}
            <Link
              to="/accounts/new"
              className="pressable grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-soft"
              aria-label={t('accounts.add')}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </Link>
          </div>
        }
      />

      {pendingCount > 0 ? (
        <Link
          to="/invites"
          className="glass-chip mb-3 flex items-center gap-3 rounded-2xl p-3.5 text-amber-800 animate-fade-in dark:text-amber-200"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/80 text-amber-500 dark:bg-white/10 dark:text-amber-400">
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 4h16v12H4zM4 7l8 5 8-5" />
            </svg>
          </span>
          <span className="flex-1 text-sm font-semibold">
            {t('invites.pendingCount', { count: pendingCount })}
          </span>
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 text-amber-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </Link>
        ) : null}

        <Link
          to="/family"
          className="glass-chip mb-3 flex items-center gap-3 rounded-2xl p-3.5 text-brand-800 animate-fade-in dark:text-brand-200"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/80 text-brand-500 dark:bg-white/10 dark:text-brand-400">
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </span>
          <span className="flex-1 text-sm font-semibold">{t('family.title')}</span>
          <span className="text-xs text-brand-500/80 dark:text-brand-300/80">{t('family.subtitle')}</span>
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 text-brand-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </Link>

      <div className="space-y-3">
        {accounts.isPending ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-[1.5rem]" />)
        ) : accounts.data?.length === 0 ? (
          <Link
            to="/accounts/new"
            className="glass-card block p-10 text-center transition-colors hover:border-brand-300 hover:bg-brand-50/60 dark:hover:border-brand-400/40 dark:hover:bg-brand-500/10"
          >
            <p className="text-sm font-medium text-ink-500 dark:text-ink-400">{t('dashboard.noAccounts')}</p>
            <span className="mt-1 inline-block text-sm font-semibold text-brand-600 dark:text-brand-400">
              {t('dashboard.noAccountsCta')}
            </span>
          </Link>
        ) : (
          accounts.data?.map((account, index) => (
            <div
              key={account.id}
              className="glass-card flex items-center gap-4 p-4 animate-fade-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <span
                className={cn(
                  'grid h-12 w-12 shrink-0 place-items-center rounded-2xl',
                  TYPE_TONES[account.type],
                )}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={TYPE_ICONS[account.type]} />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-ink-800 dark:text-ink-100">
                  <span className="truncate">{account.name}</span>
                  {account.is_shared ? (
                    <span
                      className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[0.6rem] font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"
                      title={t('accounts.sharedWithYou')}
                    >
                      {t('accounts.shared')}
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-ink-400 dark:text-ink-400">
                  {t(`accountType.${account.type}`)}
                  {account.is_shared && account.owner_name
                    ? ` · ${t('accounts.owner')}: ${account.owner_name}`
                    : ''}
                  {account.role === 'viewer' ? ` · ${t('roles.viewer')}` : ''}
                </p>
              </div>
              <p className="text-base font-bold tabular-nums text-ink-900 dark:text-ink-100">
                <AnimatedNumber
                  value={account.balance}
                  format={(v) => formatMoney(v, account.currency)}
                />
              </p>
              {account.role === 'owner' ? (
                <Link
                  to={`/accounts/${account.id}/members`}
                  aria-label={t('accounts.manageMembers')}
                  className="pressable grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-ink-400 transition-colors hover:bg-ink-50 hover:text-brand-600 dark:text-ink-400 dark:hover:bg-white/[0.06] dark:hover:text-brand-400"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </Link>
              ) : null}
            </div>
          ))
        )}
      </div>

      {accounts.data && accounts.data.length >= 4 ? (
        <p className="mt-4 text-center text-xs text-ink-400">{t('accounts.limitHint')}</p>
      ) : null}
    </AppShell>
  )
}