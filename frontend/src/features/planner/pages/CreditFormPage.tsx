import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input, Select } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { fetchAccounts } from '@/features/accounts/api'
import {
  createCredit,
  deleteCredit,
  fetchCredits,
  updateCredit,
  type CreateCreditPayload,
} from '@/features/planner/api'
import { notifyError } from '@/features/auth/errors'

function num(value: string): number | undefined {
  if (value.trim() === '') return undefined
  const n = Number(value)
  return Number.isNaN(n) ? undefined : n
}

export function CreditFormPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  const accounts = useQuery({ queryKey: ['accounts'], queryFn: fetchAccounts })
  const credits = useQuery({ queryKey: ['credits'], queryFn: fetchCredits })
  const editing = useMemo(() => credits.data?.find((c) => c.id === id), [credits.data, id])

  const [name, setName] = useState('')
  const [total, setTotal] = useState('')
  const [rate, setRate] = useState('')
  const [payment, setPayment] = useState('')
  const [paid, setPaid] = useState('')
  const [firstDate, setFirstDate] = useState('')
  const [startDate, setStartDate] = useState('')
  const [paymentDay, setPaymentDay] = useState('')
  const [notes, setNotes] = useState('')
  const [accountId, setAccountId] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const defaultCurrency = useMemo(() => {
    const owned = (accounts.data ?? []).find((a) => a.role === 'owner')
    return owned?.currency ?? 'RUB'
  }, [accounts.data])

  useEffect(() => {
    if (!editing) return
    setName(editing.name)
    setTotal(String(editing.total_amount))
    setRate(editing.interest_rate ? String(editing.interest_rate) : '')
    setPayment(editing.payment_amount ? String(editing.payment_amount) : '')
    setPaid(String(editing.paid_amount))
    setFirstDate(editing.first_payment_date ?? '')
    setStartDate(editing.start_date ?? '')
    setPaymentDay(editing.payment_day ? String(editing.payment_day) : '')
    setNotes(editing.notes ?? '')
    setAccountId(editing.account_id ?? '')
  }, [editing])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['credits'] })
    queryClient.invalidateQueries({ queryKey: ['planner'] })
  }

  const persist = useMutation({
    mutationFn: (data: CreateCreditPayload) =>
      isEdit ? updateCredit(id!, data) : createCredit(data),
    onSuccess: () => {
      invalidate()
      toast.show(isEdit ? t('credits.updated') : t('credits.saved'), 'success')
      navigate('/credits', { replace: true })
    },
    onError: (e) => setFieldErrors(notifyError(e, toast) as Record<string, string>),
  })

  const remove = useMutation({
    mutationFn: () => deleteCredit(id!),
    onSuccess: () => {
      invalidate()
      toast.show(t('credits.deleted'), 'success')
      navigate('/credits', { replace: true })
    },
    onError: (e) => notifyError(e, toast),
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    if (name.trim().length === 0) {
      setFieldErrors({ name: t('errors.credit_name_required') })
      return
    }
    const totalNum = num(total)
    if (totalNum === undefined || totalNum <= 0) {
      setFieldErrors({ total: t('errors.credit_amount_invalid') })
      return
    }
    persist.mutate({
      name: name.trim(),
      total_amount: totalNum,
      currency: defaultCurrency,
      interest_rate: num(rate) ?? 0,
      payment_amount: num(payment),
      paid_amount: num(paid) ?? 0,
      first_payment_date: firstDate || null,
      start_date: startDate || null,
      payment_day: num(paymentDay) ?? null,
      notes: notes.trim() || null,
      account_id: accountId || null,
    })
  }

  const handleDelete = () => {
    if (window.confirm(t('credits.confirmDelete'))) remove.mutate()
  }

  const loading = isEdit && credits.isPending

  return (
    <AppShell>
      <PageHeader title={t(isEdit ? 'credits.editTitle' : 'credits.newTitle')} />
      {loading ? (
        <Card className='p-5'>{t('common.loading')}</Card>
      ) : (
        <Card className='p-5 animate-fade-in-up'>
          <form onSubmit={handleSubmit} className='space-y-4'>
            <Input
              label={t('credits.name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={fieldErrors.name}
              autoFocus
            />
            <Input
              label={t('credits.amount')}
              type='number'
              inputMode='decimal'
              step='0.01'
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              error={fieldErrors.total}
            />
            <div className='grid grid-cols-2 gap-3'>
              <Input
                label={t('credits.rate')}
                type='number'
                inputMode='decimal'
                step='0.1'
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                hint='%'
              />
              <Input
                label={t('credits.payment')}
                type='number'
                inputMode='decimal'
                step='0.01'
                value={payment}
                onChange={(e) => setPayment(e.target.value)}
              />
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <Input
                label={t('credits.firstPayment')}
                type='date'
                value={firstDate}
                onChange={(e) => setFirstDate(e.target.value)}
              />
              <Input
                label={t('credits.paymentDay')}
                type='number'
                inputMode='numeric'
                min={1}
                max={28}
                value={paymentDay}
                onChange={(e) => setPaymentDay(e.target.value)}
              />
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <Input
                label={t('credits.startDate')}
                type='date'
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <Input
                label={t('credits.paid')}
                type='number'
                inputMode='decimal'
                step='0.01'
                value={paid}
                onChange={(e) => setPaid(e.target.value)}
              />
            </div>
            <Input
              label={t('credits.notes')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <Select label={t('credits.account')} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value=''>{t('credits.noAccount')}</option>
              {(accounts.data ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} · {a.currency}
                </option>
              ))}
            </Select>

            <Button type='submit' fullWidth loading={persist.isPending}>
              {t('common.save')}
            </Button>
            {isEdit ? (
              <Button type='button' variant='danger' fullWidth loading={remove.isPending} onClick={handleDelete}>
                {t('common.delete')}
              </Button>
            ) : null}
          </form>
        </Card>
      )}
    </AppShell>
  )
}
