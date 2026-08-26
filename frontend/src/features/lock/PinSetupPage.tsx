import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'

import { useLock } from './LockContext'
import { PinKeypad } from './PinKeypad'

const PIN_LENGTH = 4

type Step = 'menu' | 'create' | 'createConfirm' | 'changeOld' | 'changeNew' | 'changeConfirm'

export function PinSetupPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const {
    pinSet,
    biometricSupported,
    biometricEnabled,
    setupPin,
    changePin,
    disablePin,
    enableBiometric,
    disableBiometric,
  } = useLock()

  const [step, setStep] = useState<Step>('menu')
  const [draft, setDraft] = useState('')
  const [oldPin, setOldPin] = useState('')
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)

  const reset = (next: Step) => {
    setDraft('')
    setOldPin('')
    setError(false)
    setStep(next)
  }

  const finishCreate = async (value: string) => {
    if (busy) return
    if (value !== draft) {
      setError(true)
      setDraft('')
      return
    }
    setBusy(true)
    await setupPin(value)
    setBusy(false)
    toast.show(t('lock.pinSet'), 'success')
    reset('menu')
  }

  const finishChange = async (value: string) => {
    if (busy) return
    if (value !== draft) {
      setError(true)
      setDraft('')
      return
    }
    setBusy(true)
    const ok = await changePin(oldPin, value)
    setBusy(false)
    if (!ok) {
      setError(true)
      setDraft('')
      setOldPin('')
      setStep('changeOld')
      return
    }
    toast.show(t('lock.pinChanged'), 'success')
    reset('menu')
  }

  const verifyOld = async (value: string) => {
    if (busy) return
    setBusy(true)
    const ok = await changePin(value, value)
    setBusy(false)
    if (ok) {
      setOldPin(value)
      reset('changeNew')
    } else {
      setError(true)
      setDraft('')
    }
  }

  const toggleBiometric = async (next: boolean) => {
    if (busy) return
    setBusy(true)
    try {
      if (next) await enableBiometric()
      else disableBiometric()
    } catch {
      toast.show(t('lock.biometricFailed'), 'error')
    } finally {
      setBusy(false)
    }
  }

  const confirmDisable = () => {
    if (window.confirm(t('lock.disableConfirm'))) {
      disablePin()
      toast.show(t('lock.lockDisabled'), 'success')
    }
  }

  const title =
    step === 'menu'
      ? t('lock.settingsTitle')
      : step === 'create' || step === 'createConfirm'
        ? t('lock.createTitle')
        : t('lock.changeTitle')

  return (
    <AppShell>
      <div className='space-y-5'>
        <div className='flex items-center gap-3'>
          <button
            type='button'
            onClick={() => (step === 'menu' ? navigate('/profile') : reset('menu'))}
            className='pressable grid h-9 w-9 place-items-center rounded-full bg-white/70 text-ink-600 shadow-soft backdrop-blur-lg dark:bg-white/[0.07] dark:text-ink-300'
            aria-label={t('common.back')}
          >
            <svg viewBox='0 0 24 24' className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
              <path d='M15 18l-6-6 6-6' />
            </svg>
          </button>
          <h1 className='text-xl font-extrabold tracking-tight text-ink-900 dark:text-ink-50'>
            {title}
          </h1>
        </div>

        {step === 'menu' ? (
          <Card className='space-y-2 p-2'>
            <button
              type='button'
              onClick={() => (pinSet ? reset('changeOld') : reset('create'))}
              className='pressable flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-ink-50 dark:hover:bg-white/[0.04]'
            >
              <span className='grid h-10 w-10 place-items-center rounded-xl bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400'>
                <svg viewBox='0 0 24 24' className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                  <rect x='5' y='11' width='14' height='9' rx='2' />
                  <path d='M8 11V8a4 4 0 0 1 8 0v3' />
                </svg>
              </span>
              <span className='min-w-0 flex-1'>
                <span className='block text-sm font-semibold text-ink-800 dark:text-ink-100'>
                  {pinSet ? t('lock.changePin') : t('lock.setPin')}
                </span>
                <span className='block text-xs text-ink-400'>
                  {pinSet ? t('lock.changePinHint') : t('lock.setPinHint')}
                </span>
              </span>
            </button>

            {biometricSupported && pinSet ? (
              <div className='flex items-center gap-3 rounded-2xl p-3'>
                <span className='grid h-10 w-10 place-items-center rounded-xl bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400'>
                  <svg viewBox='0 0 24 24' className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
                    <path d='M12 11a2 2 0 0 0-2 2v3M7 13a5 5 0 0 1 .5-2.2M12 7a6 6 0 0 0-6 6v3M17 13a5 5 0 0 0-1-3M12 14v3' />
                  </svg>
                </span>
                <span className='min-w-0 flex-1'>
                  <span className='block text-sm font-semibold text-ink-800 dark:text-ink-100'>
                    {t('lock.biometric')}
                  </span>
                  <span className='block text-xs text-ink-400'>{t('lock.biometricHint')}</span>
                </span>
                <button
                  type='button'
                  role='switch'
                  aria-checked={biometricEnabled}
                  disabled={busy}
                  onClick={() => toggleBiometric(!biometricEnabled)}
                  className={cn(
                    'pressable relative h-7 w-12 shrink-0 rounded-full transition-colors',
                    biometricEnabled
                      ? 'bg-gradient-to-br from-brand-500 to-brand-600'
                      : 'bg-ink-200 dark:bg-white/15',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all',
                      biometricEnabled ? 'left-6' : 'left-1',
                    )}
                  />
                </button>
              </div>
            ) : null}

            {pinSet ? (
              <div className='border-t border-ink-100 pt-2 dark:border-white/10'>
                <button
                  type='button'
                  onClick={confirmDisable}
                  className='pressable flex w-full items-center gap-3 rounded-2xl p-3 text-left text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10'
                >
                  <span className='grid h-10 w-10 place-items-center rounded-xl bg-red-500/10'>
                    <svg viewBox='0 0 24 24' className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                      <path d='M18 6 6 18M6 6l12 12' />
                    </svg>
                  </span>
                  <span className='text-sm font-semibold'>{t('lock.disableLock')}</span>
                </button>
              </div>
            ) : null}
          </Card>
        ) : (
          <Card className='flex flex-col items-center px-4 pb-6 pt-8'>
            <PinKeypad
              value={draft}
              onChange={(v) => {
                setError(false)
                setDraft(v)
              }}
              onComplete={(v) => {
                if (step === 'create') {
                  setDraft(v)
                  setError(false)
                  setStep('createConfirm')
                } else if (step === 'createConfirm') {
                  void finishCreate(v)
                } else if (step === 'changeOld') {
                  void verifyOld(v)
                } else if (step === 'changeNew') {
                  setDraft(v)
                  setError(false)
                  setStep('changeConfirm')
                } else if (step === 'changeConfirm') {
                  void finishChange(v)
                }
              }}
              length={PIN_LENGTH}
              disabled={busy}
              error={error}
              hint={
                error
                  ? t('lock.mismatch')
                  : step === 'create'
                    ? t('lock.createHint')
                    : step === 'createConfirm'
                      ? t('lock.confirmHint')
                      : step === 'changeOld'
                        ? t('lock.currentPinHint')
                        : step === 'changeNew'
                          ? t('lock.createHint')
                          : t('lock.confirmHint')
              }
            />

            <Button
              type='button'
              variant='ghost'
              className='mt-6'
              onClick={() => reset('menu')}
            >
              {t('common.cancel')}
            </Button>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
