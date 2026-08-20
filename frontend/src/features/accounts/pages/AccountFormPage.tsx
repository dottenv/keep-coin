import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input, Select } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { createAccount, type AccountType } from '@/features/accounts/api'
import { notifyError } from '@/features/auth/errors'

const ACCOUNT_TYPES: AccountType[] = ['cash', 'card', 'wallet', 'saving']

/** Страница создания счёта (не более 4 на пользователя). */
export function AccountFormPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('cash')
  const [balance, setBalance] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const mutation = useMutation({
    mutationFn: createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      toast.show(t('accounts.saved'), 'success')
      navigate('/', { replace: true })
    },
    onError: (error) => setFieldErrors(notifyError(error, toast) as Record<string, string>),
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    const parsedBalance = balance === '' ? 0 : Number(balance)
    if (name.trim().length === 0) {
      setFieldErrors({ name: t('errors.account_name_required') })
      return
    }
    if (Number.isNaN(parsedBalance) || parsedBalance < 0) {
      setFieldErrors({ balance: t('errors.amount_invalid') })
      return
    }
    mutation.mutate({ name: name.trim(), type, balance: parsedBalance })
  }

  return (
    <AppShell>
      <PageHeader title={t('accounts.newTitle')} />
      <Card className="p-5 animate-fade-in-up">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t('accounts.name')}
            name="name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={fieldErrors.name}
          />

          <Select
            label={t('accounts.type')}
            value={type}
            onChange={(e) => setType(e.target.value as AccountType)}
          >
            {ACCOUNT_TYPES.map((option) => (
              <option key={option} value={option}>
                {t(`accountType.${option}`)}
              </option>
            ))}
          </Select>

          <Input
            label={t('accounts.initialBalance')}
            name="balance"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            error={fieldErrors.balance}
          />

          <div className="pt-1">
            <Button type="submit" fullWidth loading={mutation.isPending}>
              {t('common.save')}
            </Button>
            <p className="mt-3 text-center text-xs text-ink-400">{t('accounts.limitHint')}</p>
          </div>
        </form>
      </Card>
    </AppShell>
  )
}