import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAuth } from '@/features/auth/AuthContext'
import { Logo } from '@/components/ui/Logo'
import { GlassBackground } from '@/components/layout/GlassBackground'
import { useLock } from './LockContext'
import { PinKeypad } from './PinKeypad'

const PIN_LENGTH = 4

/**
 * Полноэкранный экран блокировки. Показывается поверх приложения, пока
 * `locked === true`: при запуске (если задан PIN) и при возврате из фона.
 */
export function LockScreen() {
  const { t } = useTranslation()
  const { locked, biometricEnabled, unlockWithPin, unlockWithBiometric } = useLock()
  const { logout } = useAuth()

  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)
  const autoBiometric = useRef(false)

  // Сбрасываем ввод при каждом (раз)блокировании.
  useEffect(() => {
    setPin('')
    setError(false)
  }, [locked])

  // Если включена биометрия — сразу предлагаем её при показе экрана.
  useEffect(() => {
    if (locked && biometricEnabled && !autoBiometric.current) {
      autoBiometric.current = true
      const id = window.setTimeout(() => {
        void unlockWithBiometric()
      }, 350)
      return () => window.clearTimeout(id)
    }
    if (!locked) autoBiometric.current = false
  }, [locked, biometricEnabled, unlockWithBiometric])

  if (!locked) return null

  const submit = async (value: string) => {
    if (busy) return
    setBusy(true)
    const ok = await unlockWithPin(value)
    setBusy(false)
    if (!ok) {
      setError(true)
      setPin('')
    }
  }

  const handleBiometric = async () => {
    if (busy) return
    setBusy(true)
    await unlockWithBiometric()
    setBusy(false)
  }

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col">
      <GlassBackground />
      <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-6">
        <div className="mb-6 animate-fade-in-up">
          <Logo size={96} variant="tile" className="rounded-[1.6rem] shadow-lifted" />
        </div>
        <h1 className="animate-fade-in text-xl font-extrabold tracking-tight text-ink-900 dark:text-ink-50">
          {t('common.appName')}
        </h1>
        <p className="mb-8 mt-1 text-sm text-ink-400">{t('lock.enterToUnlock')}</p>

        <PinKeypad
          value={pin}
          onChange={(v) => {
            setError(false)
            setPin(v)
          }}
          onComplete={submit}
          length={PIN_LENGTH}
          disabled={busy}
          error={error}
          biometric={biometricEnabled}
          onBiometric={handleBiometric}
          hint={error ? t('lock.wrongPin') : undefined}
        />

        <button
          type="button"
          onClick={handleLogout}
          className="pressable mt-10 text-xs font-semibold text-ink-400 underline-offset-2 hover:text-ink-600 hover:underline dark:hover:text-ink-200"
        >
          {t('lock.logoutInstead')}
        </button>
      </div>
    </div>
  )
}
