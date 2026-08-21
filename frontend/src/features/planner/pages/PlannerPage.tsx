import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { ProgressBar } from '@/features/planner/components/ProgressBar'
import { fetchPlanner, type Budget, type SavingsGoal, type CategoryPlan, type PlannerInsight, type PlannerOverview } from '@/features/planner/api'
import { formatMoney, formatMonthYear, formatShortDate } from '@/lib/format'
import { cn } from '@/lib/cn'

const HERO_ACCENT = 'bg-gradient-to-br from-ink-900 via-ink-800 to-brand-900'

function catLabel(t: (k: string, fallback?: string) => string, category: string | null): string {
  if (!category) return t('planner.allCategories')
  const label = t(`categories.${category}`)
  return label.startsWith('categories.') ? category : label
}

/** Планер: план vs факт, бюджеты, цели накоплений и инсайты. */
export function PlannerPage() {
  const { t } = useTranslation()
  const planner = useQuery({ queryKey: ['planner'], queryFn: fetchPlanner })

  if (planner.isPending || !planner.data) {
    return (
      <AppShell>
        <PageHeader title={t('nav.plan')} />
        <div className="space-y-4">
          <Skeleton className="h-44 rounded-[2rem]" />
          <Skeleton className="h-40 rounded-[2rem]" />
          <Skeleton className="h-40 rounded-[2rem]" />
        </div>
      </AppShell>
    )
  }

  const data = planner.data
  const monthLabel = formatMonthYear(data.month)
  const incomeBudgets = data.budgets.filter((b) => b.kind === 'income')
  const expenseBudgets = data.budgets.filter((b) => b.kind === 'expense')

  return (
    <AppShell>
      <PageHeader title={t('nav.plan')} />

      <div className="space-y-6">
        {/* Hero: сколько нужно заработать */}
        <section className={cn('relative overflow-hidden rounded-[2rem] p-5 text-white shadow-lifted animate-fade-in-up', HERO_ACCENT)}>
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10 blur-xl"
          />
          <div className="relative">
            <p className="text-sm font-medium text-white/70">{t('planner.currentMonth', { month: monthLabel })}</p>
            <p className="mt-3 text-[0.7rem] font-medium uppercase tracking-wider text-white/50">
              {t('planner.needToEarn')}
            </p>
            <p className="mt-1 text-[2rem] font-bold leading-none tabular-nums tracking-tight">
              <AnimatedNumber
                value={data.need_to_earn}
                format={(v) => formatMoney(v, data.currency)}
              />
            </p>
            <p className="mt-1.5 text-xs text-white/60">{t('planner.needToEarnSub')}</p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/10 p-3">
                <p className="text-[0.65rem] font-semibold text-white/55">{t('planner.planIncome')}</p>
                <p className="mt-0.5 text-sm font-bold tabular-nums">
                  <AnimatedNumber value={data.planned_income} format={(v) => formatMoney(v, data.currency)} />
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 p-3">
                <p className="text-[0.65rem] font-semibold text-white/55">{t('planner.plannedExpenses')}</p>
                <p className="mt-0.5 text-sm font-bold tabular-nums">
                  <AnimatedNumber value={data.planned_expenses} format={(v) => formatMoney(v, data.currency)} />
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Ключевые прогнозные цифры */}
        <div className="grid grid-cols-3 gap-3">
          <MiniCard
            label={t('planner.savings')}
            value={data.savings_target}
            currency={data.currency}
            sub={t('planner.savingsSub')}
            tone="text-amber-600"
            delay={80}
          />
          <MiniCard
            label={t('planner.projectedBalance')}
            value={data.projected_balance}
            currency={data.currency}
            sub={t('planner.projectedBalanceSub')}
            tone={data.projected_balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}
            delay={140}
          />
          <MiniCard
            label={t('planner.dailyBudget')}
            value={data.daily_budget}
            currency={data.currency}
            sub={t('planner.dailyBudgetSub')}
            tone="text-brand-600"
            delay={200}
          />
        </div>

        {/* План vs Факт */}
        <PlanVsActual data={data} />

        {/* Инсайты */}
        <Insights insights={data.insights} currency={data.currency} />

        {/* Разбивка по категориям */}
        {data.category_breakdown.length > 0 ? (
          <CategoryBreakdown breakdown={data.category_breakdown} currency={data.currency} />
        ) : null}

        <BudgetSection title={t('planner.expenseBudgets')} to="/planner/budgets/new" cta={t('planner.addBudget')} budgets={expenseBudgets} emptyText={t('planner.noBudgets')} emptyCta={t('planner.noBudgetsCta')} />
        <BudgetSection title={t('planner.incomePlans')} to="/planner/budgets/new" cta={t('planner.addIncomePlan')} budgets={incomeBudgets} emptyText={t('planner.noIncomePlans')} emptyCta={t('planner.noIncomePlansCta')} />

        <GoalSection goals={data.goals} />
      </div>
    </AppShell>
  )
}

function SectionHeaderLink({ title, to, label }: { title: string; to: string; label: string }) {
  return (
    <div className="flex items-center justify-between px-1">
      <h2 className="text-sm font-semibold text-ink-500 dark:text-ink-400">{title}</h2>
      <Link
        to={to}
        className="pressable text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
      >
        {label}
      </Link>
    </div>
  )
}

function MiniCard({
  label,
  value,
  currency,
  sub,
  tone,
  delay,
}: {
  label: string
  value: number
  currency: string
  sub: string
  tone: string
  delay: number
}) {
  return (
    <Card className="p-3.5 animate-fade-in-up" style={{ animationDelay: `${delay}ms` }}>
      <p className="truncate text-[0.7rem] font-semibold text-ink-400">{label}</p>
      <p className={cn('mt-1 truncate text-base font-bold tabular-nums tracking-tight', tone)}>
        <AnimatedNumber value={value} format={(v) => formatMoney(v, currency)} />
      </p>
      <p className="mt-1 line-clamp-2 text-[0.65rem] leading-snug text-ink-300">{sub}</p>
    </Card>
  )
}

function PlanVsActual({ data }: { data: PlannerOverview }) {
  const { t } = useTranslation()
  const currency = data.currency
  return (
    <Card className="space-y-4 p-5 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-500 dark:text-ink-400">{t('planner.planVsActual')}</h2>
        <span className="text-[0.65rem] font-medium text-ink-300">{data.days_left} {t('planner.daysLeftShort')}</span>
      </div>

      <CompareRow
        label={t('planner.income')}
        planned={data.planned_income}
        actual={data.month_income}
        currency={currency}
        goodWhenOver
      />
      <CompareRow
        label={t('planner.expense')}
        planned={data.planned_expenses}
        actual={data.month_expense}
        currency={currency}
        goodWhenOver={false}
      />

      <div className="flex items-center justify-between rounded-2xl bg-ink-50 px-4 py-3 dark:bg-white/5">
        <div>
          <p className="text-xs font-semibold text-ink-400">{t('planner.freeNet')}</p>
          <p className="text-[0.65rem] text-ink-300">{t('planner.freeNetSub')}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold tabular-nums text-ink-800 dark:text-ink-100">
            <AnimatedNumber value={data.planned_net} format={(v) => formatMoney(v, currency)} />
          </p>
          <p className={cn('text-[0.65rem] font-semibold tabular-nums', data.net_diff >= 0 ? 'text-emerald-600' : 'text-rose-500')}>
            {data.net_diff >= 0 ? '▲ ' : '▼ '}
            <AnimatedNumber value={Math.abs(data.net_diff)} format={(v) => formatMoney(v, currency)} />
            {' '}{t('planner.fact')}
          </p>
        </div>
      </div>
    </Card>
  )
}

function CompareRow({
  label,
  planned,
  actual,
  currency,
  goodWhenOver,
}: {
  label: string
  planned: number
  actual: number
  currency: string
  goodWhenOver: boolean
}) {
  const { t } = useTranslation()
  const pct = planned > 0 ? (actual / planned) * 100 : actual > 0 ? 100 : 0
  const onTrack = goodWhenOver ? actual >= planned : actual <= planned
  const tone = onTrack ? 'bg-emerald-500' : 'bg-rose-500'
  const textTone = onTrack ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'

  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-ink-500 dark:text-ink-300">{label}</span>
        <span className="flex items-center gap-2 tabular-nums">
          <span className="text-ink-300">{t('planner.plan')}: {formatMoney(planned, currency)}</span>
          <span className={cn('font-bold', textTone)}>{formatMoney(actual, currency)}</span>
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-100 dark:bg-white/10">
        <div
          className={cn('h-full rounded-full transition-all duration-700', tone)}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  )
}

function Insights({ insights, currency }: { insights: PlannerInsight[]; currency: string }) {
  const { t } = useTranslation()
  if (!insights.length) return null
  return (
    <section className="space-y-2 animate-fade-in-up">
      {insights.map((ins, i) => {
        const text = insightText(t, ins, currency)
        const palette =
          ins.tone === 'good'
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
            : ins.tone === 'warn'
              ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
              : 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300'
        const icon =
          ins.tone === 'good' ? 'M20 6 9 17l-5-5' : ins.tone === 'warn' ? 'M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z' : 'M12 16v-4m0-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z'
        return (
          <div key={i} className={cn('flex items-start gap-3 rounded-2xl p-3.5', palette)}>
            <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={icon} />
            </svg>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{text.title}</p>
              <p className="mt-0.5 text-xs opacity-80">{text.desc}</p>
            </div>
          </div>
        )
      })}
    </section>
  )
}

function insightText(t: (k: string) => string, ins: PlannerInsight, currency: string): { title: string; desc: string } {
  switch (ins.code) {
    case 'budget_over':
      return {
        title: t('insights.budget_over.title'),
        desc: t('insights.budget_over.desc', { count: ins.count ?? 0, amount: formatMoney(ins.amount ?? 0, currency) }),
      }
    case 'savings_on_track':
      return { title: t('insights.savings_on_track.title'), desc: t('insights.savings_on_track.desc') }
    case 'savings_short':
      return {
        title: t('insights.savings_short.title'),
        desc: t('insights.savings_short.desc', { have: formatMoney(ins.have ?? 0, currency), need: formatMoney(ins.need ?? 0, currency) }),
      }
    case 'negative_net':
      return {
        title: t('insights.negative_net.title'),
        desc: t('insights.negative_net.desc', { amount: formatMoney(ins.amount ?? 0, currency) }),
      }
    case 'no_income_plan':
      return { title: t('insights.no_income_plan.title'), desc: t('insights.no_income_plan.desc') }
    case 'no_daily_left':
      return { title: t('insights.no_daily_left.title'), desc: t('insights.no_daily_left.desc') }
    case 'all_good':
    default:
      return { title: t('insights.all_good.title'), desc: t('insights.all_good.desc') }
  }
}

function CategoryBreakdown({ breakdown, currency }: { breakdown: CategoryPlan[]; currency: string }) {
  const { t } = useTranslation()
  return (
    <Card className="space-y-4 p-5 animate-fade-in-up">
      <h2 className="text-sm font-semibold text-ink-500 dark:text-ink-400">{t('planner.byCategory')}</h2>
      <div className="space-y-3.5">
        {breakdown.map((item, i) => (
          <CompareRow
            key={`${item.kind}-${item.category}-${i}`}
            label={catLabel(t, item.category)}
            planned={item.planned}
            actual={item.actual}
            currency={currency}
            goodWhenOver={item.kind === 'income'}
          />
        ))}
      </div>
    </Card>
  )
}

function BudgetSection({
  title,
  to,
  cta,
  budgets,
  emptyText,
  emptyCta,
}: {
  title: string
  to: string
  cta: string
  budgets: Budget[]
  emptyText: string
  emptyCta: string
}) {
  const { t } = useTranslation()
  return (
    <section className="space-y-3 animate-fade-in-up">
      <SectionHeaderLink title={title} to={to} label={cta} />
      {budgets.length === 0 ? (
        <Link
          to={to}
          className="block rounded-[1.5rem] border border-dashed border-ink-200 bg-white/60 p-8 text-center transition-colors hover:border-brand-300 hover:bg-brand-50"
        >
          <p className="text-sm font-medium text-ink-500">{emptyText}</p>
          <span className="mt-1 inline-block text-sm font-semibold text-brand-600">{emptyCta}</span>
        </Link>
      ) : (
        <div className="space-y-3">
          {budgets.map((budget, index) => (
            <BudgetCard key={budget.id} budget={budget} index={index} />
          ))}
        </div>
      )}
    </section>
  )
}

function BudgetCard({ budget, index }: { budget: Budget; index: number }) {
  const { t } = useTranslation()
  const isIncome = budget.kind === 'income'
  const over = budget.spent > budget.amount
  const categoryLabel = catLabel(t, budget.category)
  const scopeLabel = budget.account_name ?? t('planner.allAccounts')
  const remainingTone = isIncome
    ? over
      ? 'text-emerald-600'
      : 'text-amber-600'
    : over
      ? 'text-rose-500'
      : 'text-emerald-600'

  return (
    <Link
      to={`/planner/budgets/${budget.id}/edit`}
      className="block rounded-[1.5rem] border border-ink-100 bg-white p-4 shadow-soft transition-transform active:scale-[0.99] animate-fade-in-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-1.5 truncate text-sm font-semibold text-ink-800">
          <span
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-bold',
              isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500',
            )}
          >
            {isIncome ? t('planner.incomeTag') : t('planner.expenseTag')}
          </span>
          <span className="truncate">{budget.name}</span>
          {budget.shared ? (
            <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[0.6rem] font-bold text-brand-600">
              {t('planner.shared')}
            </span>
          ) : null}
        </p>
        <p className="shrink-0 text-sm font-bold tabular-nums text-ink-900">
          <AnimatedNumber value={budget.amount} format={(v) => formatMoney(v, budget.currency)} />
        </p>
      </div>

      <div className="mt-3">
        <ProgressBar value={budget.pct} over={over && !isIncome} />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        <p className="truncate text-ink-400">
          {t('planner.spentOf', {
            spent: formatMoney(budget.spent, budget.currency),
            limit: formatMoney(budget.amount, budget.currency),
          })}
        </p>
        {over ? (
          <p className={cn('shrink-0 font-semibold tabular-nums', remainingTone)}>
            {isIncome
              ? t('planner.overEarned', { amount: formatMoney(budget.spent - budget.amount, budget.currency) })
              : t('planner.overBy', { amount: formatMoney(budget.spent - budget.amount, budget.currency) })}
          </p>
        ) : (
          <p className={cn('shrink-0 font-semibold tabular-nums', remainingTone)}>
            {t('planner.left', { amount: formatMoney(budget.remaining, budget.currency) })}
          </p>
        )}
      </div>

      <p className="mt-2 truncate text-[0.7rem] text-ink-300">
        {categoryLabel} · {scopeLabel}
      </p>
    </Link>
  )
}

function GoalSection({ goals }: { goals: SavingsGoal[] }) {
  const { t } = useTranslation()
  return (
    <section className="space-y-3 animate-fade-in-up">
      <SectionHeaderLink title={t('planner.goals')} to="/planner/goals/new" label={t('planner.noGoalsCta')} />
      {goals.length === 0 ? (
        <Link
          to="/planner/goals/new"
          className="block rounded-[1.5rem] border border-dashed border-ink-200 bg-white/60 p-8 text-center transition-colors hover:border-brand-300 hover:bg-brand-50"
        >
          <p className="text-sm font-medium text-ink-500">{t('planner.noGoals')}</p>
          <span className="mt-1 inline-block text-sm font-semibold text-brand-600">
            {t('planner.noGoalsCta')}
          </span>
        </Link>
      ) : (
        <div className="space-y-3">
          {goals.map((goal, index) => (
            <GoalCard key={goal.id} goal={goal} index={index} />
          ))}
        </div>
      )}
    </section>
  )
}

function GoalCard({ goal, index }: { goal: SavingsGoal; index: number }) {
  const { t } = useTranslation()
  const done = goal.pct >= 100
  return (
    <Link
      to={`/planner/goals/${goal.id}/edit`}
      className="block rounded-[1.5rem] border border-ink-100 bg-white p-4 shadow-soft transition-transform active:scale-[0.99] animate-fade-in-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-1.5 truncate text-sm font-semibold text-ink-800">
          <span className="truncate">{goal.name}</span>
          {goal.shared ? (
            <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[0.6rem] font-bold text-brand-600">
              {t('planner.shared')}
            </span>
          ) : null}
        </p>
        <p className="shrink-0 text-sm font-bold tabular-nums text-ink-900">
          <AnimatedNumber value={goal.target_amount} format={(v) => formatMoney(v, goal.currency)} />
        </p>
      </div>

      <div className="mt-3">
        <ProgressBar value={goal.pct} />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        <p className="truncate text-ink-400">
          {t('planner.savedOfTarget', {
            saved: formatMoney(goal.saved_amount, goal.currency),
            target: formatMoney(goal.target_amount, goal.currency),
          })}
        </p>
        <p className="shrink-0 font-semibold tabular-nums text-brand-600">
          {t('planner.perMonth', { amount: formatMoney(goal.needed_per_month, goal.currency) })}
        </p>
      </div>

      <p className="mt-2 flex items-center justify-between truncate text-[0.7rem] text-ink-300">
        <span className="truncate">
          {goal.account_name ?? t('goals.accountNone')}
          {done ? ` · ${t('planner.completed')}` : ''}
        </span>
        {goal.deadline ? (
          <span className="shrink-0">{t('planner.deadlineTo', { date: formatShortDate(goal.deadline) })}</span>
        ) : null}
      </p>
    </Link>
  )
}
