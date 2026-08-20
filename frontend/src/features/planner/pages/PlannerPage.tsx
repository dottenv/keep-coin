import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { ProgressBar } from '@/features/planner/components/ProgressBar'
import { fetchPlanner, type Budget, type SavingsGoal } from '@/features/planner/api'
import { formatMoney, formatMonthYear, formatShortDate } from '@/lib/format'
import { cn } from '@/lib/cn'

const HERO_ACCENT = 'bg-gradient-to-br from-ink-900 via-ink-800 to-brand-900'

/** Планер: сколько нужно заработать, бюджеты и цели накоплений. */
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
                <p className="text-[0.65rem] font-semibold text-white/55">{t('planner.usualIncome')}</p>
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

        <BudgetSection budgets={data.budgets} />
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

function BudgetSection({ budgets }: { budgets: Budget[] }) {
  const { t } = useTranslation()
  return (
    <section className="space-y-3 animate-fade-in-up" style={{ animationDelay: '260ms' }}>
      <SectionHeaderLink title={t('planner.budgets')} to="/planner/budgets/new" label={t('planner.noBudgetsCta')} />
      {budgets.length === 0 ? (
        <Link
          to="/planner/budgets/new"
          className="block rounded-[1.5rem] border border-dashed border-ink-200 bg-white/60 p-8 text-center transition-colors hover:border-brand-300 hover:bg-brand-50"
        >
          <p className="text-sm font-medium text-ink-500">{t('planner.noBudgets')}</p>
          <span className="mt-1 inline-block text-sm font-semibold text-brand-600">
            {t('planner.noBudgetsCta')}
          </span>
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

function BudgetCard({
  budget,
  index,
}: {
  budget: Budget
  index: number
}) {
  const { t } = useTranslation()
  const over = budget.spent > budget.amount
  const categoryLabel = budget.category
    ? t(`categories.${budget.category}`)
    : t('planner.allCategories')
  const scopeLabel = budget.account_name ?? t('planner.allAccounts')

  return (
    <Link
      to={`/planner/budgets/${budget.id}/edit`}
      className="block rounded-[1.5rem] border border-ink-100 bg-white p-4 shadow-soft transition-transform active:scale-[0.99] animate-fade-in-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-1.5 truncate text-sm font-semibold text-ink-800">
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
        <ProgressBar value={budget.pct} over={over} />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        <p className="truncate text-ink-400">
          {t('planner.spentOf', {
            spent: formatMoney(budget.spent, budget.currency),
            limit: formatMoney(budget.amount, budget.currency),
          })}
        </p>
        {over ? (
          <p className="shrink-0 font-semibold text-rose-500">
            {t('planner.overBy', { amount: formatMoney(budget.spent - budget.amount, budget.currency) })}
          </p>
        ) : (
          <p className="shrink-0 font-semibold text-emerald-600">
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
    <section className="space-y-3 animate-fade-in-up" style={{ animationDelay: '320ms' }}>
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