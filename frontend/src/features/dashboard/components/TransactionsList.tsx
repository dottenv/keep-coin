import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import type { Account } from '@/features/accounts/api'
import type { Transaction } from '@/features/transactions/api'
import { formatShortDate, formatSignedMoney, isToday, formatMoney } from '@/lib/format'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/cn'

const TYPE_ICONS: Record<Transaction['type'], string> = {
  income: 'M12 19V5M5 12l7-7 7 7',
  expense: 'M12 5v14M5 12l7 7 7-7',
  transfer: 'M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4',
}

const TYPE_TONES: Record<Transaction['type'], string> = {
  income: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
  expense: 'bg-rose-50 text-rose-500 dark:bg-rose-500/15 dark:text-rose-400',
  transfer: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400',
}

/** Список операций: строки со счётом, категорией и суммой (клик → детали). */
export function TransactionsList({
  transactions,
  accounts,
  loading,
}: {
  transactions?: Transaction[]
  accounts?: Account[]
  loading?: boolean
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  if (loading || !transactions || !accounts) {
    return (
      <div className="glass-card space-y-3 p-5">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <button
        type="button"
        onClick={() => navigate('/add?type=expense')}
        className="glass-card w-full p-8 text-center transition-colors hover:border-brand-300 hover:bg-brand-50/60 dark:hover:border-brand-400/40 dark:hover:bg-brand-500/10"
      >
        <p className="text-sm font-medium text-ink-700 dark:text-ink-200">{t('dashboard.noTransactions')}</p>
        <p className="mt-1 text-xs text-ink-400">{t('dashboard.noTransactionsSub')}</p>
      </button>
    )
  }

  const accountsById = new Map(accounts.map((a) => [a.id, a]))

  return (
    <div className="glass-card overflow-hidden">
      <ul className="divide-y divide-ink-50 dark:divide-white/[0.06]">
        {transactions.map((tx, index) => {
          const account = accountsById.get(tx.account_id)
          const toAccount = tx.to_account_id ? accountsById.get(tx.to_account_id) : undefined
          return (
            <li
              key={tx.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
            >
              <button
                type="button"
                onClick={() => navigate(`/transactions/${tx.id}`)}
                className="group flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/60 dark:hover:bg-white/[0.04]"
              >
                <span
                  className={cn(
                    'grid h-11 w-11 shrink-0 place-items-center rounded-2xl',
                    TYPE_TONES[tx.type],
                  )}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={TYPE_ICONS[tx.type]} />
                  </svg>
                </span>

                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-ink-800 dark:text-ink-100">
                    <span className="truncate">{tx.title || t('transactions.transfer')}</span>
                    {tx.recurring ? (
                      <span
                        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-50 px-1.5 py-0.5 text-[0.6rem] font-bold text-violet-600 dark:bg-violet-500/15 dark:text-violet-300"
                        title={t('transactions.recurringNote')}
                      >
                        <CalendaIcon />
                        {t('transactions.recurring')}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-ink-400">
                    {tx.type !== 'transfer' ? t(`categories.${tx.category}`) : null}
                    {account ? ` · ${account.name}` : ''}
                    {tx.type === 'transfer' && toAccount ? ` → ${toAccount.name}` : ''}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <span
                    className={cn(
                      'text-sm font-bold tabular-nums',
                      tx.type === 'expense'
                        ? 'text-ink-800 dark:text-ink-100'
                        : tx.type === 'income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-sky-600 dark:text-sky-400',
                    )}
                  >
                    {tx.type === 'transfer'
                      ? formatMoney(tx.amount, tx.currency)
                      : formatSignedMoney(
                          tx.type === 'expense' ? -tx.amount : tx.amount,
                          tx.currency,
                        )}
                  </span>
                  <span className="text-[0.7rem] text-ink-400">
                    {isToday(tx.date) ? t('date.today') : formatShortDate(tx.date)}
                  </span>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function CalendaIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-2.5 w-2.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 7h16M8 3v4M16 3v4M4 10h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
      <path d="M11 15l1.5 1.5L14.5 14" />
    </svg>
  )
}