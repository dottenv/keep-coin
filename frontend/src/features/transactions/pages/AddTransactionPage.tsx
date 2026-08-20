import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input, Select } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { createTransaction, fetchTransaction, updateTransaction, type CreateTransactionPayload, type TransactionType, type UpdateTransactionPayload } from '@/features/transactions/api'
import { fetchAccounts } from '@/features/accounts/api'
import { notifyError } from '@/features/auth/errors'
import { todayISO } from '@/lib/format'
import { cn } from '@/lib/cn'

const TYPES: TransactionType[] = ['income', 'expense', 'transfer']

const CATEGORIES: Record<TransactionType, string[]> = {
  income: ['salary', 'freelance', 'gift', 'other'],
  expense: ['food', 'transport', 'shopping', 'entertainment', 'home', 'other'],
  transfer: ['other'],
}

/** Страница добавления/редактирования операции (доход / расход / перевод). */
export function AddTransactionPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const { id } = useParams<{ id: string }>()
  const isEditMode = Boolean(id)

  const initialType: TransactionType =
    searchParams.get('type') === 'income' ||
    searchParams.get('type') === 'transfer'
      ? (searchParams.get('type') as TransactionType)
      : 'expense'

  const [type, setType] = useState<TransactionType>(initialType)
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('other')
  const [accountId, setAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [date, setDate] = useState(todayISO())
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const accounts = useQuery({ queryKey: ['accounts'], queryFn: fetchAccounts })
  const existingTx = useQuery({
    queryKey: ['transactions', id],
    queryFn: () => fetchTransaction(id!),
    enabled: isEditMode,
  })

  const availableAccounts = useMemo(() => {
  const all = accounts.data ?? []
  // Записывать можно только в свои/редактируемые: у «наблюдателей» доступа к записи нет.
  const writable = all.filter((a) => a.role !== 'viewer')
  // При редактировании счёт из операции может быть «наблюдательским» — оставляем его в списке,
  // чтобы селект показывал текущее значение (сохранение всё равно отклонит сервер).
  if (!existingTx.data) return writable
  const current = [existingTx.data.account_id, existingTx.data.to_account_id].filter(
    (x): x is string => Boolean(x),
  )
  for (const id of current) {
    const acc = all.find((a) => a.id === id)
    if (acc && !writable.some((a) => a.id === id)) writable.push(acc)
  }
  return writable
}, [accounts.data, existingTx.data])
  const sourceAccounts =
    type === 'transfer' && toAccountId
      ? availableAccounts.filter((a) => a.id !== toAccountId)
      : availableAccounts
  const targetAccounts =
    type === 'transfer' && accountId
      ? availableAccounts.filter((a) => a.id !== accountId)
      : availableAccounts

  // Загрузка данных существующей операции при редактировании
  useEffect(() => {
    if (existingTx.data) {
      const tx = existingTx.data
      setType(tx.type)
      setTitle(tx.title)
      setAmount(tx.amount.toString())
      setCategory(tx.category)
      setAccountId(tx.account_id)
      setToAccountId(tx.to_account_id || '')
      setDate(tx.date)
    }
  }, [existingTx.data])

  // Авто-выбор счетов, когда выбор очевиден: один счёт — сразу он,
  // при переводе ровно с двух счетов — «с какого → на какой».
  useEffect(() => {
    if (availableAccounts.length === 0 || isEditMode) return
    if (type === 'transfer') {
      if (availableAccounts.length === 2) {
        setAccountId('')
        setToAccountId('')
      }
      return
    }
    setAccountId((current) => current || availableAccounts[0].id)
  }, [type, availableAccounts, isEditMode])

  // Авто-выбор для перевода при смене счетов-источника.
  useEffect(() => {
    if (type !== 'transfer' || isEditMode) return
    if (availableAccounts.length === 2) {
      setAccountId(availableAccounts[0].id)
      setToAccountId(availableAccounts[1].id)
    } else if (availableAccounts.length === 1) {
      setAccountId(availableAccounts[0].id)
      setToAccountId('')
    } else {
      setAccountId('')
      setToAccountId('')
    }
  }, [type, availableAccounts, isEditMode])

  const createMutation = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      toast.show(t('transactions.saved'), 'success')
      navigate('/', { replace: true })
    },
    onError: (error) => setFieldErrors(notifyError(error, toast) as Record<string, string>),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTransactionPayload }) =>
      updateTransaction(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['transactions', id] })
      toast.show(t('transactions.updated'), 'success')
      navigate(`/transactions/${id}`)
    },
    onError: (error) => setFieldErrors(notifyError(error, toast) as Record<string, string>),
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    const errors: Record<string, string> = {}
    const parsedAmount = Number(amount)

    if (type !== 'transfer' && title.trim().length === 0)
      errors.title = t('errors.title_required')
    if (amount === '' || Number.isNaN(parsedAmount) || parsedAmount <= 0)
      errors.amount = t('errors.amount_invalid')
    if (!accountId) errors.account_id = t('errors.account_required')
    if (type === 'transfer' && !toAccountId)
      errors.to_account_id = t('errors.to_account_required')
    if (type === 'transfer' && toAccountId && toAccountId === accountId)
      errors.to_account_id = t('errors.transfer_same_account')
    if (!date) errors.date = t('errors.invalid_date')

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    
    const payload: CreateTransactionPayload = {
      type,
      account_id: accountId,
      to_account_id: type === 'transfer' ? toAccountId : null,
      title: type === 'transfer' ? '' : title.trim(),
      category,
      amount: parsedAmount,
      date,
    }

    if (isEditMode) {
      updateMutation.mutate({ id: id!, payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const pageTitle = isEditMode ? t('transactions.editTitle') : t('transactions.addTitle')
  const isLoading = accounts.isPending || (isEditMode && existingTx.isPending)

  return (
    <AppShell>
      <PageHeader title={pageTitle} />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 rounded-2xl" />
          <Skeleton className="h-96 rounded-[2rem]" />
        </div>
      ) : availableAccounts.length === 0 ? (
        <Card className="p-8 text-center animate-fade-in">
          <p className="text-sm font-medium text-ink-700 dark:text-ink-200">{t('transactions.noAccountsForTx')}</p>
          <p className="mt-1 text-xs text-ink-400">{t('transactions.noAccountsForTxSub')}</p>
          <Button fullWidth className="mt-5" onClick={() => navigate('/accounts/new')}>
            {t('accounts.add')}
          </Button>
        </Card>
      ) : (
        <Card key={type} className="p-5 animate-scale-in">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Переключатель типа */}
            <div
              className="grid grid-cols-3 gap-1 rounded-2xl border border-ink-200 bg-ink-50 p-1 dark:border-white/15 dark:bg-white/[0.06]"
              role="group"
              aria-label={t('transactions.type')}
            >
              {TYPES.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setType(option)
                    setFieldErrors({})
                  }}
                  className={cn(
                    'pressable rounded-xl py-2 text-xs font-bold transition-colors',
                    type === option
                      ? 'bg-white text-ink-900 shadow-soft dark:bg-white/[0.12] dark:text-ink-100'
                      : 'text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-200',
                  )}
                >
                  {t(`transactions.${option}`)}
                </button>
              ))}
            </div>

            {type === 'transfer' ? (
              <div className="flex items-center gap-2 rounded-xl bg-sky-50 px-3.5 py-2.5 text-xs font-medium text-sky-700 dark:bg-sky-500/15 dark:text-sky-200">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4" />
                </svg>
                {t('transactions.noTitleHint')}
              </div>
            ) : (
              <Input
                label={t('transactions.title')}
                name="title"
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                error={fieldErrors.title}
              />
            )}

            <Input
              label={t('transactions.amount')}
              name="amount"
              type="number"
              inputMode="decimal"
              min={0.01}
              step="0.01"
              autoFocus={type === 'transfer'}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              error={fieldErrors.amount}
              leftSlot={
                <span className="text-sm font-semibold text-ink-500">
                  {type === 'expense' ? '−' : type === 'income' ? '+' : '→'}
                </span>
              }
            />

            <Select
              label={t('transactions.category')}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES[type].map((code) => (
                <option key={code} value={code}>
                  {t(`categories.${code}`)}
                </option>
              ))}
            </Select>

            <Select
              label={
                type === 'transfer' ? t('transactions.fromAccount') : t('transactions.account')
              }
              value={accountId}
              onChange={(e) => {
                setAccountId(e.target.value)
                setFieldErrors({})
              }}
              error={fieldErrors.account_id}
            >
              <option value="">{t('common.selectPrompt')}</option>
              {sourceAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>

            {type === 'transfer' ? (
              <Select
                label={t('transactions.toAccount')}
                value={toAccountId}
                onChange={(e) => {
                  setToAccountId(e.target.value)
                  setFieldErrors({})
                }}
                error={fieldErrors.to_account_id}
              >
                <option value="">{t('common.selectPrompt')}</option>
                {targetAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </Select>
            ) : null}

            <Input
              label={t('transactions.date')}
              name="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              error={fieldErrors.date}
            />

            <Button
              type="submit"
              fullWidth
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {isEditMode ? t('common.update') : t('common.save')}
            </Button>
          </form>
        </Card>
      )}
    </AppShell>
  )
}