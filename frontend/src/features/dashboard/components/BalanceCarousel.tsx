import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import type { Account } from '@/features/accounts/api'
import { formatMoney } from '@/lib/format'
import { Skeleton } from '@/components/ui/Skeleton'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { cn } from '@/lib/cn'

const ACCENTS = [
  'from-ink-900 via-ink-800 to-brand-900',
  'from-sky-600 via-sky-700 to-brand-800',
  'from-amber-500 via-amber-600 to-rose-600',
  'from-brand-500 via-brand-600 to-emerald-800',
] as const

const TYPE_ICONS: Record<Account['type'], string> = {
  cash: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  card: 'M3 6h18v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM3 10h18',
  wallet: 'M20 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a3 3 0 0 0 3 3h13a2 2 0 0 0 2-2zM3 7h18',
  saving: 'M12 2v20M2 12h20M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4',
}

/** Карусель счетов: горизонтальная лента скруглённых карточек со snap-прокруткой. */
export function BalanceCarousel({
  accounts,
  loading,
}: {
  accounts?: Account[]
  loading?: boolean
}) {
  const { t } = useTranslation()

  if (loading || !accounts) {
    return (
      <div className="space-y-3">
        <div className="flex gap-3">
          <Skeleton className="h-44 w-[82%] shrink-0 rounded-[2rem]" />
          <Skeleton className="h-44 w-[70%] shrink-0 rounded-[2rem]" />
        </div>
        <Skeleton className="mx-auto h-1.5 w-16 rounded-full" />
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <Link
        to="/accounts/new"
        className="glass-card block p-8 text-center transition-colors hover:border-brand-300 hover:bg-brand-50/60 dark:hover:border-brand-400/40 dark:hover:bg-brand-500/10"
      >
        <p className="text-sm font-medium text-ink-500 dark:text-ink-400">{t('dashboard.noAccounts')}</p>
        <span className="mt-1 inline-block text-sm font-semibold text-brand-600 dark:text-brand-400">
          {t('dashboard.noAccountsCta')}
        </span>
      </Link>
    )
  }

  return (
    <div>
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-2">
        {accounts.map((account, index) => (
          <article
            key={account.id}
            role="group"
            aria-label={account.name}
            className={cn(
              'relative min-h-[11rem] w-[78%] shrink-0 snap-center overflow-hidden rounded-[2rem] p-5 text-white shadow-lifted animate-fade-in-up',
              'bg-gradient-to-br',
              ACCENTS[index % ACCENTS.length],
            )}
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10 blur-xl"
            />
            <div className="relative flex h-full flex-col justify-between gap-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-medium text-white/75">
                    <span className="truncate">{account.name}</span>
                    {account.is_shared ? (
                      <span className="shrink-0 rounded-full bg-white/20 px-1.5 py-0.5 text-[0.6rem] font-bold text-white/90">
                        {t('accounts.shared')}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-xs text-white/50">
                    {t(`accountType.${account.type}`)}
                    {account.is_shared && account.owner_name
                      ? ` · ${account.owner_name}`
                      : ''}
                  </p>
                </div>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/15">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={TYPE_ICONS[account.type]} />
                  </svg>
                </span>
              </div>
              <div>
                <p className="text-[0.7rem] font-medium uppercase tracking-wider text-white/50">
                  {t('dashboard.balance')}
                </p>
                <p className="text-3xl font-bold tabular-nums tracking-tight">
                  <AnimatedNumber
                    value={account.balance}
                    format={(v) => formatMoney(v, account.currency)}
                  />
                </p>
              </div>
            </div>
          </article>
        ))}

        {/* Кнопка добавления (до лимита) */}
        {accounts.length < 4 ? (
          <Link
            to="/accounts/new"
            aria-label={t('accounts.add')}
            className="glass-card grid min-h-[11rem] w-[58%] shrink-0 snap-center place-items-center border-2 border-dashed text-center text-ink-400 transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-white/15 dark:text-ink-400 dark:hover:border-brand-400/60 dark:hover:text-brand-400"
          >
            <span className="flex flex-col items-center gap-2">
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="text-xs font-semibold">{t('accounts.add')}</span>
            </span>
          </Link>
        ) : null}
      </div>

      {/* индикатор позиции */}
      <div className="mt-1 flex items-center justify-center gap-1.5">
        {accounts.map((account) => (
          <span
            key={account.id}
            className="h-1.5 w-4 rounded-full bg-brand-500/35"
            aria-hidden
          />
        ))}
      </div>
    </div>
  )
}