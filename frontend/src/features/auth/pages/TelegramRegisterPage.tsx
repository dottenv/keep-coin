import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/features/auth/AuthContext'
import { notifyError } from '@/features/auth/errors'
import { getTelegramInitData } from '@/lib/telegram'

export function TelegramRegisterPage() {
  const { t, i18n } = useTranslation()
  const { telegramPending, telegramRegister } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState(
    [telegramPending?.first_name, telegramPending?.last_name].filter(Boolean).join(' ').trim(),
  )
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  // Прямой заход без данных Telegram — отправляем на обычную регистрацию.
  if (!telegramPending) {
    navigate('/register', { replace: true })
    return null
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const initData = getTelegramInitData()
    if (!initData) {
      toast.show(t('telegram.linkError'), 'error')
      return
    }
    setFieldErrors({})
    setSubmitting(true)
    try {
      await telegramRegister({
        init_data: initData,
        email,
        password,
        display_name: displayName,
        locale: i18n.language.startsWith('en') ? 'en' : 'ru',
      })
      navigate('/', { replace: true })
    } catch (error) {
      setFieldErrors(notifyError(error, toast))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <Card className="p-6 sm:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 dark:text-ink-100">
            {t('telegram.registerTitle')}
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            {t('telegram.registerSub', {
              name:
                telegramPending.username
                  ? `@${telegramPending.username}`
                  : [telegramPending.first_name, telegramPending.last_name]
                      .filter(Boolean)
                      .join(' '),
            })}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label={t('auth.displayName')}
            name="display_name"
            autoComplete="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            error={fieldErrors.display_name}
            placeholder={t('auth.namePlaceholder')}
          />
          <Input
            label={t('auth.email')}
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
            placeholder="you@example.com"
          />
          <Input
            label={t('auth.password')}
            type="password"
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
            placeholder={t('auth.passwordPlaceholder')}
          />

          {fieldErrors.globals ? (
            <p className="text-sm font-medium text-red-500 animate-fade-in">
              {fieldErrors.globals}
            </p>
          ) : null}

          <Button type="submit" fullWidth size="lg" loading={submitting}>
            {t('telegram.registerCta')}
          </Button>
        </form>
      </Card>
    </AuthLayout>
  )
}
