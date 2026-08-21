import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { FloatingAction } from '@/components/layout/FloatingAction'
import { Card } from '@/components/ui/Card'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { SectionHeader } from './components/SectionHeader'
import { BalanceCarousel } from './components/BalanceCarousel'
import { TransactionsList } from './components/TransactionsList'
import { fetchAccounts } from '@/features/accounts/api'
import { fetchTransactions } from '@/features/transactions/api'
import { formatMoney } from '@/lib/format'
import { useAuth } from '@/features/auth/AuthContext'

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

  const totalBalance = accounts.data?.reduce((sum, acc) => sum + (acc.balance || 0), 0) ?? 0

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
              className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-gradient-to-br from-brand-400/40 to-emerald-400/30 blur-3xl ultra:from-emerald-400/40 ultra:to-teal-400/30"
            />
            <p className="text-sm font-medium text-ink-500 dark:text-ink-300">{t('dashboard.totalBalance')}</p>
            <p className="mt-1 text-4xl font-bold tabular-nums tracking-tight text-ink-900 dark:text-ink-100">
              <AnimatedNumber value={totalBalance} format={(v) => formatMoney(v, 'RUB')} />
            </p>
            <p className="mt-1 text-xs text-ink-400">
              {t('dashboard.totalBalanceSub', { count: accounts.data?.length ?? 0 })}
            </p>
          </Card>

          <section className="space-y-3">
            <SectionHeader title={t('dashboard.yourAccounts')} />
            <BalanceCarousel accounts={accounts.data} loading={accounts.isPending} />
          </section>

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