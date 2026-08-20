import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { DonutChart, type DonutSegment } from '@/components/ui/DonutChart'
import { fetchSummary } from '@/features/transactions/api'
import { formatMoney, getIntlLocale } from '@/lib/format'
import { cn } from '@/lib/cn'

const PALETTE = [
  '#10b981',
  '#f59e0b',
  '#3b82f6',
  '#ef4444',
  '#8b5cf6',
  '#14b8a6',
  '#f97316',
  '#6366f1',
  '#94a3b8',
]

const CURRENCY = 'RUB' // временно — пока нет мультивалютности

/** Страница «Статистика»: итоги, «бублик» по категориям и динамика по месяцам. */
export function StatsPage() {
  const { t } = useTranslation()
  const summary = useQuery({ queryKey: ['transactions', 'summary'], queryFn: fetchSummary })

  if (summary.isPending || !summary.data) {
    return (
      <AppShell>
        <PageHeader title={t('nav.stats')} />
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-[2rem]" />
          <Skeleton className="h-72 rounded-[2rem]" />
          <Skeleton className="h-48 rounded-[2rem]" />
        </div>
      </AppShell>
    )
  }

  const data = summary.data
  const net = data.total_income - data.total_expense

  const donutSegments: DonutSegment[] = data.expense_by_category.map((item, index) => ({
    value: item.total,
    color: PALETTE[index % PALETTE.length],
  }))

  const maxMonthly = Math.max(1, ...data.monthly.flatMap((m) => [m.income, m.expense]))

  const statCards = [
    {
      key: 'net',
      label: t('stats.net'),
      tone: net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600',
      sub: t('stats.allTime'),
    },
    {
      key: 'income',
      label: t('stats.income'),
      tone: 'text-emerald-600 dark:text-emerald-400',
      sub: `${t('stats.month')} · ${formatMoney(data.month_income, CURRENCY)}`,
    },
    {
      key: 'expense',
      label: t('stats.expense'),
      tone: 'text-ink-800 dark:text-ink-100',
      sub: `${t('stats.month')} · ${formatMoney(data.month_expense, CURRENCY)}`,
    },
  ]

  return (
    <AppShell>
      <PageHeader title={t('nav.stats')} />

      <div className="space-y-4">
        {/* Итоги */}
        <div className="grid grid-cols-2 gap-3">
          {statCards.map((card, index) => (
            <Card
              key={card.key}
              className={cn('p-4 animate-fade-in-up', card.key === 'net' && 'col-span-2')}
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <p className="text-xs font-semibold text-ink-400">{card.label}</p>
              <p className={cn('mt-1 text-lg font-bold tabular-nums tracking-tight', card.tone)}>
                <AnimatedNumber
                  value={card.key === 'income' ? data.total_income : card.key === 'expense' ? data.total_expense : net}
                  format={(v) => formatMoney(v, CURRENCY)}
                />
              </p>
              <p className="mt-1 text-[0.7rem] text-ink-300 dark:text-ink-400">{card.sub}</p>
            </Card>
          ))}
        </div>

        {/* «Бублик» — расходы по категориям */}
        <Card className="p-5 animate-fade-in-up" style={{ animationDelay: '180ms' }}>
          <h2 className="text-sm font-semibold text-ink-500 dark:text-ink-400">{t('stats.byCategory')}</h2>
          {data.expense_by_category.length === 0 ? (
            <p className="mt-4 text-center text-xs text-ink-400">{t('stats.noExpenses')}</p>
          ) : (
            <div className="mt-4 flex flex-col items-center gap-5">
              <DonutChart
                segments={donutSegments}
                centerValue={
                  <AnimatedNumber
                    value={data.total_expense}
                    format={(v) => formatMoney(v, CURRENCY)}
                    className="text-2xl"
                  />
                }
                centerLabel={t('stats.expense')}
              />
              <ul className="w-full space-y-2">
                {data.expense_by_category.map((item, index) => (
                  <li
                    key={item.category}
                    className="flex items-center gap-2.5 animate-fade-in-up"
                    style={{ animationDelay: `${200 + index * 45}ms` }}
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: PALETTE[index % PALETTE.length] }}
                    />
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink-700 dark:text-ink-200">
                      {t(`categories.${item.category}`)}
                    </span>
                    <span className="text-xs font-bold tabular-nums text-ink-800 dark:text-ink-100">
                      {Math.round((item.total / data.total_expense) * 100)}%
                    </span>
                    <span className="w-24 shrink-0 text-right text-xs font-semibold tabular-nums text-ink-500 dark:text-ink-400">
                      {formatMoney(item.total, CURRENCY)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {/* Динамика по месяцам */}
        {data.monthly.some((m) => m.income > 0 || m.expense > 0) ? (
          <Card className="p-5 animate-fade-in-up" style={{ animationDelay: '260ms' }}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink-500 dark:text-ink-400">{t('stats.sixMonths')}</h2>
              <div className="flex items-center gap-3 text-[0.65rem] font-medium text-ink-400">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> {t('stats.income')}
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-rose-400" /> {t('stats.expense')}
                </span>
              </div>
            </div>
            <div className="flex items-end justify-between gap-2">
              {data.monthly.map((item, index) => {
                const label = monthLabel(item.month)
                const isCurrent = index === data.monthly.length - 1
                return (
                  <div
                    key={item.month}
                    className={cn(
                      'flex flex-1 flex-col items-center gap-1.5',
                      isCurrent && 'opacity-100',
                    )}
                  >
                    <div className="flex h-24 items-end gap-1">
                      <div
                        className="w-2.5 rounded-full bg-emerald-500"
                        style={{
                          height: `${Math.max(4, (item.income / maxMonthly) * 100)}%`,
                          transition: 'height 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      />
                      <div
                        className="w-2.5 rounded-full bg-rose-400"
                        style={{
                          height: `${Math.max(4, (item.expense / maxMonthly) * 100)}%`,
                          transition: 'height 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      />
                    </div>
                    <span
                      className={cn(
                        'text-[0.65rem] font-semibold',
                        isCurrent ? 'text-brand-600 dark:text-brand-400' : 'text-ink-400',
                      )}
                    >
                      {label}
                    </span>
                  </div>
                )
              })}
            </div>
          </Card>
        ) : null}

        {/* Повторяющиеся операции */}
        <Card className="flex items-center gap-3 p-4 animate-fade-in-up" style={{ animationDelay: '320ms' }}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 7h16M8 3v4M16 3v4M4 10h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
              <path d="M11 15l1.5 1.5L14.5 14" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink-800 dark:text-ink-100">{t('stats.recurring')}</p>
            <p className="mt-0.5 text-xs text-ink-400">{t('stats.recurringNote')}</p>
          </div>
          <span className="shrink-0 rounded-full bg-violet-100 px-3 py-1 text-sm font-bold tabular-nums text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
            <AnimatedNumber value={data.recurring_count} />
          </span>
        </Card>
      </div>
    </AppShell>
  )
}

function monthLabel(month: string): string {
  const [year, mm] = month.split('-').map(Number)
  return new Intl.DateTimeFormat(getIntlLocale(), {
    month: 'short',
  }).format(new Date(year, mm - 1, 1))
}