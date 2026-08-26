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
import { createGoal, deleteGoal, fetchGoals, updateGoal } from '@/features/planner/api'
import { notifyError } from '@/features/auth/errors'
import { todayISO } from '@/lib/format'

/** Форма цели накоплений: создание и редактирование (/planner/goals/new и /:id/edit). */
export function GoalFormPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  const accounts = useQuery({ queryKey: ['accounts'], queryFn: fetchAccounts })
  const goals = useQuery({ queryKey: ['goals'], queryFn: fetchGoals })

  const editing = useMemo(() => goals.data?.find((g) => g.id === id), [goals.data, id])

  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [saved, setSaved] = useState('')
  const [deadline, setDeadline] = useState('')
  const [contribution, setContribution] = useState('')
  const [accountId, setAccountId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'>('none')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!editing) return
    setName(editing.name)
    setTarget(String(editing.target_amount))
    setSaved(String(editing.saved_amount))
    setDeadline(editing.deadline ?? '')
    setContribution(editing.monthly_contribution ? String(editing.monthly_contribution) : '')
    setAccountId(editing.account_id ?? '')
    setStartDate(editing.start_date ?? '')
    setEndDate(editing.end_date ?? '')
    setRecurrence(editing.recurrence ?? 'none')
  }, [editing])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['planner'] })
    queryClient.invalidateQueries({ queryKey: ['goals'] })
  }

  const persist = useMutation({
    mutationFn: (data: Parameters<typeof createGoal>[0]) =>
      isEdit ? updateGoal(id!, data) : createGoal(data),
    onSuccess: () => {
      invalidate()
      toast.show(isEdit ? t('goals.updated') : t('goals.created'), 'success')
      navigate('/planner', { replace: true })
    },
    onError: (error) => setFieldErrors(notifyError(error, toast) as Record<string, string>),
  })

  const remove = useMutation({
    mutationFn: () => deleteGoal(id!),
    onSuccess: () => {
      invalidate()
      toast.show(t('goals.deleted'), 'success')
      navigate('/planner', { replace: true })
    },
    onError: (error) => notifyError(error, toast),
  })

  const editableAccounts = useMemo(
    () => (accounts.data ?? []).filter((a) => a.role === 'owner' || a.role === 'editor'),
    [accounts.data],
  )

  const parseAmount = (value: string, fallback = 0): number => {
    if (value === '') return fallback
    const n = Number(value)
    return Number.isNaN(n) ? fallback : n
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    const targetAmount = parseAmount(target)
    if (name.trim().length === 0) {
      setFieldErrors({ name: t('errors.goal_name_required') })
      return
    }
    if (targetAmount <= 0) {
      setFieldErrors({ target: t('errors.goal_target_invalid') })
      return
    }
    persist.mutate({
      name: name.trim(),
      target_amount: targetAmount,
      saved_amount: parseAmount(saved),
      deadline: deadline || null,
      monthly_contribution: contribution === '' ? null : parseAmount(contribution),
      account_id: accountId || null,
      start_date: startDate || null,
      end_date: endDate || null,
      recurrence,
    })
  }

  const handleDelete = () => {
    if (window.confirm(t('goals.confirmDelete'))) remove.mutate()
  }

  const loading = isEdit && goals.isPending

  return (
    <AppShell>
      <PageHeader title={t(isEdit ? 'goals.editTitle' : 'goals.newTitle')} />
      {loading ? (
        <Card className="p-5">{t('common.loading')}</Card>
      ) : (
        <Card className="p-5 animate-fade-in-up">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t('goals.name')}
              name="name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('goals.namePlaceholder')}
              error={fieldErrors.name}
            />

            <Input
              label={t('goals.target')}
              name="target"
              type="number"
              inputMode="decimal"
              min={0.01}
              step="0.01"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              hint={t('goals.targetHint')}
              error={fieldErrors.target}
            />

            <Input
              label={t('goals.saved')}
              name="saved"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={saved}
              onChange={(e) => setSaved(e.target.value)}
              error={fieldErrors.saved}
            />

            <Input
              label={t('goals.monthlyContribution')}
              name="monthly"
              type="number"
              inputMode="decimal"
              min={0.01}
              step="0.01"
              value={contribution}
              onChange={(e) => setContribution(e.target.value)}
              hint={t('goals.monthlyContributionHint')}
              error={fieldErrors.monthly_contribution}
            />

            <Input
              label={t('goals.deadline')}
              name="deadline"
              type="date"
              min={todayISO()}
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />

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

            <Select label={t('goals.account')} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">{t('goals.accountNone')}</option>
              {editableAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                  {account.is_shared ? ` · ${t('planner.shared')}` : ''}
                </option>
              ))}
            </Select>

            <p className="text-xs text-ink-400">{t('goals.accountHint')}</p>

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