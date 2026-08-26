import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input, Select } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { fetchAccounts } from '@/features/accounts/api'
import { fetchCategories, type Category } from '@/features/categories/api'
import {
  createBudget,
  deleteBudget,
  fetchBudgets,
  updateBudget,
  type BudgetPeriod,
} from '@/features/planner/api'
import { notifyError } from '@/features/auth/errors'

const PERIODS: BudgetPeriod[] = ['month', 'week', 'year']

const BUILTIN_BY_KIND = {
  expense: ['food', 'transport', 'shopping', 'entertainment', 'home', 'other'],
  income: ['salary', 'freelance', 'gift', 'other'],
} as const

/** Форма бюджета: создание и редактирование (/planner/budgets/new и /:id/edit). */
export function BudgetFormPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  const accounts = useQuery({ queryKey: ['accounts'], queryFn: fetchAccounts })
  const categories = useQuery({ queryKey: ['categories'], queryFn: fetchCategories })
  const budgets = useQuery({ queryKey: ['budgets'], queryFn: fetchBudgets })

  const editing = useMemo(() => budgets.data?.find((b) => b.id === id), [budgets.data, id])

  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [period, setPeriod] = useState<BudgetPeriod>('month')
  const [kind, setKind] = useState<'expense' | 'income'>('expense')
  const [accountId, setAccountId] = useState('')
  const [category, setCategory] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'>('none')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!editing) return
    setName(editing.name)
    setAmount(String(editing.amount))
    setPeriod(editing.period)
    setKind(editing.kind ?? 'expense')
    setAccountId(editing.account_id ?? '')
    setCategory(editing.category ?? '')
    setStartDate(editing.start_date ?? '')
    setEndDate(editing.end_date ?? '')
    setRecurrence(editing.recurrence ?? 'none')
  }, [editing])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['planner'] })
    queryClient.invalidateQueries({ queryKey: ['budgets'] })
  }

  const persist = useMutation({
    mutationFn: (data: Parameters<typeof createBudget>[0]) =>
      isEdit ? updateBudget(id!, data) : createBudget(data),
    onSuccess: () => {
      invalidate()
      toast.show(isEdit ? t('budgets.updated') : t('budgets.saved'), 'success')
      navigate('/planner', { replace: true })
    },
    onError: (error) => setFieldErrors(notifyError(error, toast) as Record<string, string>),
  })

  const remove = useMutation({
    mutationFn: () => deleteBudget(id!),
    onSuccess: () => {
      invalidate()
      toast.show(t('budgets.deleted'), 'success')
      navigate('/planner', { replace: true })
    },
    onError: (error) => notifyError(error, toast),
  })

  const categoryOptions = useMemo(() => {
    const custom: Category[] = (categories.data ?? []).filter((c) => c.kind === kind)
    const builtins = BUILTIN_BY_KIND[kind]
    return [
      ...builtins.map((code) => ({ value: code, label: t(`categories.${code}`) })),
      ...custom.map((c) => ({ value: c.name, label: c.name })),
    ]
  }, [categories.data, kind, t])

  const editableAccounts = useMemo(
    () => (accounts.data ?? []).filter((a) => a.role === 'owner' || a.role === 'editor'),
    [accounts.data],
  )

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    const parsedAmount = Number(amount)
    if (name.trim().length === 0) {
      setFieldErrors({ name: t('errors.budget_name_required') })
      return
    }
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setFieldErrors({ amount: t('errors.budget_amount_invalid') })
      return
    }
    persist.mutate({
      name: name.trim(),
      amount: parsedAmount,
      period,
      kind,
      account_id: accountId || null,
      category: category || null,
      start_date: startDate || null,
      end_date: endDate || null,
      recurrence,
    })
  }

  const handleDelete = () => {
    if (window.confirm(t('budgets.confirmDelete'))) remove.mutate()
  }

  const loading = isEdit && budgets.isPending

  return (
    <AppShell>
      <PageHeader title={t(isEdit ? 'budgets.editTitle' : 'budgets.newTitle')} />
      {loading ? (
        <Card className="p-5">{t('common.loading')}</Card>
      ) : (
        <Card className="p-5 animate-fade-in-up">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t('budgets.name')}
              name="name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('budgets.namePlaceholder')}
              error={fieldErrors.name}
            />

            <Input
              label={t('budgets.amount')}
              name="amount"
              type="number"
              inputMode="decimal"
              min={0.01}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              hint={kind === 'income' ? t('budgets.amountHintIncome') : t('budgets.amountHint')}
              error={fieldErrors.amount}
            />

            <Select
              label={t('budgets.kind')}
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as 'expense' | 'income')
                setCategory('')
              }}
            >
              <option value="expense">{t('budgets.kindExpense')}</option>
              <option value="income">{t('budgets.kindIncome')}</option>
            </Select>

            <Select
              label={t('budgets.period')}
              value={period}
              onChange={(e) => setPeriod(e.target.value as BudgetPeriod)}
            >
              {PERIODS.map((option) => (
                <option key={option} value={option}>
                  {t(`budgets.period${option[0].toUpperCase()}${option.slice(1)}`)}
                </option>
              ))}
            </Select>

            <Select label={t('budgets.scope')} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">{t('budgets.scopeAll')}</option>
              {editableAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                  {account.is_shared ? ` · ${t('planner.shared')}` : ''}
                </option>
              ))}
            </Select>

            <Select label={t('budgets.category')} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">{t('budgets.categoryNone')}</option>
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label={t('plans.startDate')}
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <Input
                label={t('plans.endDate')}
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <Select
              label={t('plans.recurrence')}
              value={recurrence}
              onChange={(e) =>
                setRecurrence(
                  e.target.value as 'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly',
                )
              }
            >
              <option value="none">{t('plans.recurrenceNone')}</option>
              <option value="daily">{t('plans.recurrenceDaily')}</option>
              <option value="weekly">{t('plans.recurrenceWeekly')}</option>
              <option value="monthly">{t('plans.recurrenceMonthly')}</option>
              <option value="quarterly">{t('plans.recurrenceQuarterly')}</option>
              <option value="yearly">{t('plans.recurrenceYearly')}</option>
            </Select>

            <p className="text-xs text-ink-400">{t('budgets.accountHint')}</p>

            <Button type="submit" fullWidth loading={persist.isPending}>
              {t('common.save')}
            </Button>

            {isEdit ? (
              <Button
                type="button"
                variant="danger"
                fullWidth
                loading={remove.isPending}
                onClick={handleDelete}
              >
                {t('common.delete')}
              </Button>
            ) : null}
          </form>
        </Card>
      )}
    </AppShell>
  )
}