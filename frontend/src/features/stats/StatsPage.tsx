import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { Spinner } from '@/components/ui/Spinner'
import { DonutChart, type DonutSegment } from '@/components/ui/DonutChart'
import { fetchSummary, type SummaryFilters, type TransactionType } from '@/features/transactions/api'
import { fetchAccounts, type Account } from '@/features/accounts/api'
import { fetchCategories, categoryView, type Category } from '@/features/categories/api'
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

const BUILTIN: Record<TransactionType, string[]> = {
  income: ['salary', 'freelance', 'gift', 'other'],
  expense: ['food', 'transport', 'shopping', 'entertainment', 'home', 'other'],
  transfer: ['other'],
}

export function StatsPage() {
  const { t } = useTranslation()
  const [filters, setFilters] = useState<SummaryFilters>({})

  const accounts = useQuery({ queryKey: ['accounts'], queryFn: fetchAccounts })
  const categoriesQ = useQuery({ queryKey: ['categories'], queryFn: fetchCategories })
  const summary = useQuery({
    queryKey: ['transactions', 'summary', filters],
    queryFn: () => fetchSummary(filters),
    placeholderData: (prev) => prev,
  })

  const allCategories: Category[] = categoriesQ.data ?? []

  const categoryOptions = [
    ...allCategories.map((c) => ({ value: c.name, label: c.name })),
    ...BUILTIN.expense.map((code) => ({ value: code, label: t(`categories.${code}`) })),
  ]

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
    color: item.color || PALETTE[index % PALETTE.length],
  }))

  const maxMonthly = Math.max(1, ...data.monthly.flatMap((m) => [m.income, m.expense]))

  const statCards = [
    { key: 'net', label: t('stats.net'), tone: net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600', sub: t('stats.allTime') },
    { key: 'income', label: t('stats.income'), tone: 'text-emerald-600 dark:text-emerald-400', sub: `${t('stats.month')} · ${formatMoney(data.month_income, currency)}` },
    { key: 'expense', label: t('stats.expense'), tone: 'text-ink-800 dark:text-ink-100', sub: `${t('stats.month')} · ${formatMoney(data.month_expense, currency)}` },
  ]

  const hasFilters = Object.values(filters).some(Boolean)

  return (
    <AppShell>
      <PageHeader title={t('nav.stats')} />

      {summary.isFetching && summary.data ? (
        <div className="flex justify-center pb-1">
          <Spinner size="sm" className="border-brand-200 border-t-brand-500" />
        </div>
      ) : null}

      <div className="space-y-4">
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
                  format={(v) => formatMoney(v, currency)}
                />
              </p>
              <p className="mt-1 text-[0.7rem] text-ink-300 dark:text-ink-400">{card.sub}</p>
            </Card>
          ))}
        </div>

        <Card className="p-3 animate-fade-in-up">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <select
              value={filters.type ?? ''}
              onChange={(e) => setFilters({ ...filters, type: (e.target.value || undefined) as TransactionType | undefined })}
              className="h-10 w-full rounded-xl border border-ink-200 bg-white/80 px-3 text-sm outline-none dark:border-white/15 dark:bg-white/[0.07] dark:text-ink-100"
            >
              <option value="">{t('transactions.type')}</option>
              <option value="income">{t('transactions.income')}</option>
              <option value="expense">{t('transactions.expense')}</option>
              <option value="transfer">{t('transactions.transfer')}</option>
            </select>

            <select
              value={filters.category ?? ''}
              onChange={(e) => setFilters({ ...filters, category: e.target.value || undefined })}
              className="h-10 w-full rounded-xl border border-ink-200 bg-white/80 px-3 text-sm outline-none dark:border-white/15 dark:bg-white/[0.07] dark:text-ink-100"
            >
              <option value="">{t('transactions.category')}</option>
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <select
              value={filters.account_id ?? ''}
              onChange={(e) => setFilters({ ...filters, account_id: e.target.value || undefined })}
              className="h-10 w-full rounded-xl border border-ink-200 bg-white/80 px-3 text-sm outline-none dark:border-white/15 dark:bg-white/[0.07] dark:text-ink-100"
            >
              <option value="">{t('transactions.account')}</option>
              {accounts.data?.map((a: Account) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <input
                type="date"
                value={filters.date_from ?? ''}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value || undefined })}
                className="h-10 min-w-0 flex-1 rounded-xl border border-ink-200 bg-white/80 px-3 text-sm outline-none dark:border-white/15 dark:bg-white/[0.07] dark:text-ink-100"
              />
              <span className="shrink-0 text-xs text-ink-400">–</span>
              <input
                type="date"
                value={filters.date_to ?? ''}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value || undefined })}
                className="h-10 min-w-0 flex-1 rounded-xl border border-ink-200 bg-white/80 px-3 text-sm outline-none dark:border-white/15 dark:bg-white/[0.07] dark:text-ink-100"
              />
            </div>
            {hasFilters ? (
              <button
                type="button"
                onClick={() => setFilters({})}
                className="h-10 shrink-0 rounded-xl border border-ink-200 px-3 text-xs font-semibold text-ink-500 transition-colors hover:bg-ink-50 dark:border-white/15 dark:text-ink-300 dark:hover:bg-white/[0.06]"
              >
                {t('common.clearFilters')}
              </button>
            ) : null}
          </div>
        </Card>

        <Card className="p-5 animate-fade-in-up" style={{ animationDelay: '180ms' }}>
          <h2 className="text-sm font-semibold text-ink-500 dark:text-ink-400">{t('stats.byCategory')}</h2>
          {data.expense_by_category.length === 0 ? (
            <p className="mt-4 text-center text-xs text-ink-400">{t('stats.noExpenses')}</p>
          ) : (
            <div className="mt-4 flex flex-col items-center gap-5">
              <DonutChart
                segments={donutSegments}
                className="ultra:[filter:drop-shadow(0_0_10px_rgba(16,185,129,0.35))]"
                centerValue={<AnimatedNumber value={data.total_expense} format={(v) => formatMoney(v, currency)} className="text-2xl" />}
                centerLabel={t('stats.expense')}
              />
              <ul className="w-full space-y-2">
                {data.expense_by_category.map((item, index) => {
                  const view = categoryView(t, { category: item.category, name: item.name, color: item.color, icon: item.icon })
                  const color = item.color || PALETTE[index % PALETTE.length]
                  return (
                    <li key={item.category_id ?? item.category} className="flex items-center gap-2.5 animate-fade-in-up" style={{ animationDelay: `${200 + index * 45}ms` }}>
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                      <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink-700 dark:text-ink-200">{view.label}</span>
                      <span className="text-xs font-bold tabular-nums text-ink-800 dark:text-ink-100">{Math.round((item.total / data.total_expense) * 100)}%</span>
                      <span className="w-24 shrink-0 text-right text-xs font-semibold tabular-nums text-ink-500 dark:text-ink-400">{formatMoney(item.total, currency)}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </Card>

        {data.monthly.some((m) => m.income > 0 || m.expense > 0) ? (
          <Card className="p-5 animate-fade-in-up" style={{ animationDelay: '260ms' }}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink-500 dark:text-ink-400">{t('stats.sixMonths')}</h2>
              <div className="flex items-center gap-3 text-[0.65rem] font-medium text-ink-400">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {t('stats.income')}</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-400" /> {t('stats.expense')}</span>
              </div>
            </div>
            <div className="flex items-end justify-between gap-2">
              {data.monthly.map((item, index) => {
                const label = monthLabel(item.month)
                const isCurrent = index === data.monthly.length - 1
                return (
                  <div key={item.month} className={cn('flex flex-1 flex-col items-center gap-1.5', isCurrent && 'opacity-100')}>
                    <div className="flex h-24 items-end gap-1">
                      <div className="w-2.5 rounded-full bg-emerald-500" style={{ height: `${Math.max(4, (item.income / maxMonthly) * 100)}%`, transition: 'height 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }} />
                      <div className="w-2.5 rounded-full bg-rose-400" style={{ height: `${Math.max(4, (item.expense / maxMonthly) * 100)}%`, transition: 'height 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }} />
                    </div>
                    <span className={cn('text-[0.65rem] font-semibold', isCurrent ? 'text-brand-600 dark:text-brand-400' : 'text-ink-400')}>{label}</span>
                  </div>
                )
              })}
            </div>
          </Card>
        ) : null}

        <Card className="flex items-center gap-3 p-4 animate-fade-in-up" style={{ animationDelay: '320ms' }}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
  return new Intl.DateTimeFormat(getIntlLocale(), { month: 'short' }).format(new Date(year, mm - 1, 1))
}
