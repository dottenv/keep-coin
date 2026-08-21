import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import type { ReactNode } from 'react'

import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { useToast } from '@/components/ui/Toast'
import { fetchAccounts } from '@/features/accounts/api'
import { deleteTransaction, fetchTransaction } from '@/features/transactions/api'
import { categoryView, CATEGORY_ICON_PATHS } from '@/features/categories/api'
import { formatLongDate, formatMoney, formatSignedMoney } from '@/lib/format'
import { cn } from '@/lib/cn'

const TYPE_LABEL_KEY: Record<string, string> = {
  income: 'transactions.income',
  expense: 'transactions.expense',
  transfer: 'transactions.transfer',
}

/** Страница деталей операции (клик по транзакции). */
export function TransactionDetailPage() {
  const { t } = useTranslation()
  const params = useParams<{ id: string }>()
  const id = params.id

  const accounts = useQuery({ queryKey: ['accounts'], queryFn: fetchAccounts })
  const tx = useQuery({
    queryKey: ['transactions', id],
    queryFn: () => {
      if (!id) throw new Error('Transaction ID is required')
      return fetchTransaction(id)
    },
    enabled: Boolean(id),
  })

  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const toast = useToast()

  const deleteMutation = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      toast.show(t('transactions.deleted'), 'success')
      navigate('/transactions')
    },
    onError: () => {
      toast.show(t('transactions.deleteError'), 'error')
    },
  })

  const handleDelete = () => {
    if (window.confirm(t('transactions.confirmDelete'))) {
      deleteMutation.mutate(id!)
    }
  }

  if (tx.isError) {
    return (
      <AppShell>
        <PageHeader title={t('transactions.detailsTitle')} />
        <div className="glass-card p-8 text-center">
          <p className="text-sm font-medium text-ink-700 dark:text-ink-200">{t('common.error')}</p>
          <p className="mt-1 text-xs text-ink-400">{t('errors.transaction_not_found')}</p>
        </div>
      </AppShell>
    )
  }

  if (tx.isPending || !tx.data) {
    return (
      <AppShell>
        <PageHeader title={t('transactions.detailsTitle')} />
        <div className="space-y-4">
          <Skeleton className="h-44 rounded-[2rem]" />
          <Skeleton className="h-40 rounded-[2rem]" />
        </div>
      </AppShell>
    )
  }

  const data = tx.data
  const account = accounts.data?.find((a) => a.id === data.account_id)
  const toAccount = data.to_account_id
    ? accounts.data?.find((a) => a.id === data.to_account_id)
    : undefined

  const isIncome = data.type === 'income'
  const isExpense = data.type === 'expense'
  const signedAmount =
    isExpense ? -data.amount : isIncome ? data.amount : data.amount

  const rows: Array<{ label: string; value?: string }> = [
    {
      label: t('transactions.type'),
      value: t(TYPE_LABEL_KEY[data.type] ?? 'transactions.transfer'),
    },
  ]
  if (data.type !== 'transfer') {
    const view = categoryView(t, {
      category: data.category,
      name: data.category_id ? data.category : null,
      color: data.category_color,
      icon: data.category_icon,
    })
    const categoryNode = (
      <span className="flex items-center justify-end gap-1.5">
        {view.color ? (
          <span
            className="grid h-4 w-4 place-items-center rounded-full"
            style={{ backgroundColor: `${view.color}22`, color: view.color }}
          >
            {view.icon && CATEGORY_ICON_PATHS[view.icon] ? (
              <svg
                viewBox="0 0 24 24"
                className="h-2.5 w-2.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={CATEGORY_ICON_PATHS[view.icon]} />
              </svg>
            ) : null}
          </span>
        ) : null}
        {view.label}
      </span>
    )
    rows.push({
      label: t('transactions.category'),
      value: view.label,
      node: categoryNode,
    } as (typeof rows)[number] & { node?: ReactNode })
  }
  rows.push({ label: t('transactions.account'), value: account?.name })
  if (data.type === 'transfer' && toAccount) {
    rows.push({ label: t('transactions.toAccount'), value: toAccount.name })
  }
  rows.push({
    label: t('transactions.date'),
    value: formatLongDate(data.date),
  })
  if (!data.is_own && data.author_name) {
    rows.push({ label: t('transactions.author'), value: data.author_name })
  }

  return (
    <AppShell>
      <PageHeader
        title={t('transactions.detailsTitle')}
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/transactions/${id}/edit`)}
              className="pressable grid h-10 w-10 place-items-center rounded-full border border-ink-200 bg-white/80 text-ink-600 shadow-soft backdrop-blur-lg transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-white/15 dark:bg-white/[0.06] dark:text-ink-300 dark:hover:border-brand-400/50 dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
              aria-label={t('common.edit')}
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
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="pressable grid h-10 w-10 place-items-center rounded-full border border-ink-200 bg-white/80 text-ink-600 shadow-soft backdrop-blur-lg transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:border-white/15 dark:bg-white/[0.06] dark:text-ink-300 dark:hover:border-rose-400/50 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
              aria-label={t('common.delete')}
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
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        }
      />

      <Card className="overflow-hidden animate-fade-in-up">
        {/* Сумма */}
        <div
          className={cn(
            'px-6 py-8 text-center',
            isIncome
              ? 'bg-emerald-50/80 dark:bg-emerald-500/10'
              : isExpense
                ? 'bg-rose-50/80 dark:bg-rose-500/10'
                : 'bg-sky-50/80 dark:bg-sky-500/10',
          )}
        >
          <p
            className={cn(
              'text-3xl font-bold tabular-nums tracking-tight',
              isIncome
                ? 'text-emerald-600 dark:text-emerald-400'
                : isExpense
                  ? 'text-ink-800 dark:text-ink-100'
                  : 'text-sky-600 dark:text-sky-400',
            )}
          >
            <AnimatedNumber
              value={signedAmount}
              format={(v) =>
                data.type === 'transfer'
                  ? formatMoney(v, data.currency)
                  : formatSignedMoney(v, data.currency)
              }
            />
          </p>
          <p
            className={cn(
              'mt-2 flex items-center justify-center gap-2 text-sm font-semibold text-ink-700 dark:text-ink-200',
            )}
          >
            <span className="truncate">{data.title || t('transactions.transfer')}</span>
            {data.recurring ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[0.65rem] font-bold text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                {t('transactions.recurring')}
              </span>
            ) : null}
          </p>
          <span
            className={cn(
              'mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold',
              isIncome
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                : isExpense
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                  : 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
            )}
          >
            {t(TYPE_LABEL_KEY[data.type] ?? 'transactions.transfer')}
          </span>
        </div>

        <dl className="divide-y divide-ink-50 px-6 py-4 dark:divide-white/[0.06]">
          {rows.map(
            (row) =>
              row.value || (row as { node?: ReactNode }).node ? (
                <div key={row.label} className="flex items-center justify-between py-3">
                  <dt className="text-sm text-ink-400">{row.label}</dt>
                  <dd className="max-w-[55%] truncate text-sm font-semibold text-ink-800 dark:text-ink-100">
                    {(row as { node?: ReactNode }).node ?? row.value}
                  </dd>
                </div>
              ) : null,
          )}
        </dl>
      </Card>
    </AppShell>
  )
}