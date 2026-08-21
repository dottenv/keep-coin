import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { FloatingAction } from '@/components/layout/FloatingAction'
import { Card } from '@/components/ui/Card'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { DonutChart, type DonutSegment } from '@/components/ui/DonutChart'
import { SectionHeader } from './components/SectionHeader'
import { BalanceCarousel } from './components/BalanceCarousel'
import { TransactionsList } from './components/TransactionsList'
import { fetchAccounts } from '@/features/accounts/api'
import { fetchTransactions, fetchSummary, type Summary } from '@/features/transactions/api'
import { fetchPlanner, type PlannerOverview } from '@/features/planner/api'
import { formatMoney, todayISO } from '@/lib/format'
import { useAuth } from '@/features/auth/AuthContext'
import { cn } from '@/lib/cn'

const PALETTE = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#6366f1']

/** Главный экран приложения после авторизации. */
export function DashboardPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()

  const accounts = useQuery({ queryKey: ['accounts'], queryFn: fetchAccounts })
  const recent = useQuery({
    queryKey: ['transactions', 'recent'],
    queryFn: () => fetchTransactions(5),
    staleTime: 30_000,
  })
  const planner = useQuery({ queryKey: ['planner'], queryFn: fetchPlanner, staleTime: 30_000 })

  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const summary = useQuery({
    queryKey: ['transactions', 'summary', 'month'],
    queryFn: () => fetchSummary({ date_from: monthStart, date_to: todayISO() }),
    staleTime: 30_000,
  })

  const accountsList = accounts.data ?? []
  const currency =
    accountsList.length > 0
      ? accountsList.reduce((top, a) => (Math.abs(a.balance) > Math.abs(top.balance) ? a : top), accountsList[0]).currency
      : 'RUB'

  const totalBalance = accountsList.reduce((sum, acc) => sum + (acc.balance || 0), 0)
  const plan = planner.data
  const monthSummary = summary.data

  return (
    <>
      <AppShell>
        <div className="space-y-7">
          <div className="animate-fade-in">
            <h1 className="text-2xl font-bold tracking-tight text-ink-900 text-balance dark:text-ink-100">
              {user ? t('dashboard.greeting', { name: user.display_name }) : ''}
            </h1>
            <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">{t('dashboard.greetingSub')}</p>
          </div>

          <Card className="relative overflow-hidden p-5 animate-fade-in-up sm:p-6">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-gradient-to-br from-brand-400/40 to-emerald-400/30 blur-3xl ultra:from-white/20 ultra:to-transparent"
            />
            <p className="text-sm font-medium text-ink-500 dark:text-ink-300">{t('dashboard.totalBalance')}</p>
            <p className="mt-1 text-4xl font-bold tabular-nums tracking-tight text-ink-900 dark:text-ink-100">
              <AnimatedNumber value={totalBalance} format={(v) => formatMoney(v, currency)} />
            </p>
            <p className="mt-1 text-xs text-ink-400">
              {t('dashboard.totalBalanceSub', { count: accountsList.length ?? 0 })}
            </p>
          </Card>

          <section className="space-y-3">
            <SectionHeader title={t('dashboard.yourAccounts')} />
            <BalanceCarousel accounts={accounts.data} loading={accounts.isPending} />
          </section>

          {/* Виджет плана месяца из планера */}
          <PlanWidget plan={plan} currency={currency} hasAccounts={accountsList.length > 0} />

          {/* Виджет расходов по категориям + Аналитика */}
          <CategoryWidget summary={monthSummary} currency={currency} loading={summary.isPending} onAnalytics={() => navigate('/stats')} />

          <section className="space-y-3">
            <SectionHeader
              title={t('dashboard.recent')}
              actionLabel={t('dashboard.viewAll')}
              onAction={() => navigate('/transactions')}
            />
            <TransactionsList
              transactions={recent.data}
              accounts={accounts.data}
              loading={recent.isPending || accounts.isPending}
            />
          </section>
        </div>
      </AppShell>
      <FloatingAction />
    </>
  )
}

function PlanWidget({
  plan,
  currency,
  hasAccounts,
}: {
  plan: PlannerOverview | undefined
  currency: string
  hasAccounts: boolean
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const p = plan

  if (!hasAccounts) return null

  return (
    <section className="space-y-3 animate-fade-in-up">
      <SectionHeader title={t('dashboard.planTitle')} actionLabel={t('dashboard.openPlan')} onAction={() => navigate('/planner')} />
      {!p ? (
        <Card className="p-5 animate-pulse">
          <div className="h-16 rounded-xl bg-ink-100 dark:bg-white/10" />
        </Card>
      ) : !p.has_plan ? (
        <Link
          to="/planner"
          className="block rounded-[1.5rem] border border-dashed border-ink-200 bg-white/60 p-5 text-center transition-colors hover:border-brand-300 hover:bg-brand-50"
        >
          <p className="text-sm font-medium text-ink-500">{t('dashboard.planEmpty')}</p>
          <span className="mt-1 inline-block text-sm font-semibold text-brand-600">{t('dashboard.planSetup')}</span>
        </Link>
      ) : (
        <Link to="/planner" className="block rounded-[1.5rem] border border-ink-100 bg-white p-5 shadow-soft transition-transform active:scale-[0.99]">
          <div className="grid grid-cols-3 gap-3">
            <Stat label={t('dashboard.planIncome')} value={p.planned_income} currency={currency} tone="text-emerald-600" />
            <Stat label={t('dashboard.planExpenses')} value={p.planned_expenses} currency={currency} tone="text-rose-500" />
            <Stat
              label={t('dashboard.planLeft')}
              value={p.unassigned}
              currency={currency}
              tone={p.unassigned >= 0 ? 'text-brand-600' : 'text-rose-500'}
            />
          </div>
        </Link>
      )}
    </section>
  )
}

function Stat({ label, value, currency, tone }: { label: string; value: number; currency: string; tone: string }) {
  return (
    <div>
      <p className="truncate text-[0.7rem] font-semibold text-ink-400">{label}</p>
      <p className={cn('mt-1 truncate text-lg font-bold tabular-nums tracking-tight', tone)}>
        <AnimatedNumber value={value} format={(v) => formatMoney(v, currency)} />
      </p>
    </div>
  )
}

function CategoryWidget({
  summary,
  currency,
  loading,
  onAnalytics,
}: {
  summary: Summary | undefined
  currency: string
  loading: boolean
  onAnalytics: () => void
}) {
  const { t } = useTranslation()

  const cats = summary?.expense_by_category ?? []
  const total = cats.reduce((s, c) => s + c.total, 0)
  const segments: DonutSegment[] = cats.slice(0, 8).map((c, i) => ({
    value: c.total,
    color: c.color || PALETTE[i % PALETTE.length],
  }))

  return (
    <section className="space-y-3 animate-fade-in-up">
      <SectionHeader title={t('dashboard.categoryTitle')} actionLabel={t('dashboard.analytics')} onAction={onAnalytics} />
      <Card className="p-5">
        {loading ? (
          <div className="h-40 animate-pulse rounded-xl bg-ink-100 dark:bg-white/10" />
        ) : cats.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-400">{t('dashboard.categoryEmpty')}</p>
        ) : (
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
            <div className="shrink-0">
              <DonutChart
                segments={segments}
                size={150}
                thickness={20}
                centerValue={
                  <span className="text-lg font-bold tabular-nums text-ink-900 dark:text-ink-100">
                    <AnimatedNumber value={total} format={(v) => formatMoney(v, currency)} />
                  </span>
                }
                centerLabel={t('stats.expense')}
              />
            </div>
            <ul className="w-full flex-1 space-y-2">
              {cats.slice(0, 5).map((c, i) => {
                const color = c.color || PALETTE[i % PALETTE.length]
                const label = c.name || (c.category ? t(`categories.${c.category}`) : c.category)
                const pct = total > 0 ? Math.round((c.total / total) * 100) : 0
                return (
                  <li key={c.category_id ?? c.category} className="flex items-center gap-2.5">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-700 dark:text-ink-200">
                      {label?.startsWith('categories.') ? c.category : label}
                    </span>
                    <span className="text-sm font-bold tabular-nums text-ink-800 dark:text-ink-100">
                      {formatMoney(c.total, currency)}
                    </span>
                    <span className="w-9 shrink-0 text-right text-xs font-semibold text-ink-400">{pct}%</span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </Card>
    </section>
  )
}
