import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/features/auth/AuthContext'
import { notifyError } from '@/features/auth/errors'

export function RegisterPage() {
  const { t, i18n } = useTranslation()
  const { register } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFieldErrors({})
    setSubmitting(true)
    try {
      await register({
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
            {t('auth.join')}
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{t('auth.joinSub')}</p>
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
            {t('auth.register')}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-500">
          {t('auth.haveAccount')}{' '}
          <Link
            to="/login"
            className="font-semibold text-brand-600 hover:text-brand-700 hover:underline"
          >
            {t('auth.loginLink')}
          </Link>
        </p>
      </Card>
    </AuthLayout>
  )
}