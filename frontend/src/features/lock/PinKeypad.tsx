import { useTranslation } from 'react-i18next'

import { haptics } from '@/lib/haptics'
import { cn } from '@/lib/cn'

interface PinKeypadProps {
  value: string
  onChange: (value: string) => void
  /** Вызывается, когда набрано `length` цифр. */
  onComplete?: (value: string) => void
  length?: number
  disabled?: boolean
  /** Анимация ошибки (тряска точек). */
  error?: boolean
  /** Показать кнопку биометрии. */
  biometric?: boolean
  onBiometric?: () => void
  /** Текст подсказки над точками. */
  hint?: string
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

export function PinKeypad({
  value,
  onChange,
  onComplete,
  length = 4,
  disabled = false,
  error = false,
  biometric = false,
  onBiometric,
  hint,
}: PinKeypadProps) {
  const { t } = useTranslation()

  const press = (digit: string) => {
    if (disabled) return
    if (value.length >= length) return
    haptics.tap()
    const next = value + digit
    onChange(next)
    if (next.length === length) {
      onComplete?.(next)
    }
  }

  const remove = () => {
    if (disabled || value.length === 0) return
    haptics.tap()
    onChange(value.slice(0, -1))
  }

  const dots = Array.from({ length })

  return (
    <div className="flex flex-col items-center">
      {hint ? (
        <p className="mb-3 text-sm font-medium text-ink-500 dark:text-ink-400">{hint}</p>
      ) : null}

      <div className={cn('mb-7 flex items-center gap-4', error && 'animate-[shake_0.4s]')}>
        {dots.map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-3.5 w-3.5 rounded-full transition-all duration-200',
              i < value.length
                ? 'scale-110 bg-brand-500 dark:bg-brand-400'
                : 'bg-ink-300/60 dark:bg-white/15',
              error && 'bg-red-500 dark:bg-red-400',
            )}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3.5">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            disabled={disabled}
            onClick={() => press(k)}
            className="pressable grid h-16 w-16 place-items-center rounded-2xl bg-white/70 text-2xl font-semibold text-ink-800 shadow-soft backdrop-blur-lg disabled:opacity-50 dark:bg-white/[0.07] dark:text-ink-100"
          >
            {k}
          </button>
        ))}

        {/* Биометрия */}
        <button
          type="button"
          disabled={disabled || !biometric}
          onClick={onBiometric}
          aria-label={t('lock.biometric')}
          className="pressable grid h-16 w-16 place-items-center rounded-2xl bg-white/70 text-ink-600 shadow-soft backdrop-blur-lg disabled:opacity-0 dark:bg-white/[0.07] dark:text-ink-300"
        >
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 11a2 2 0 0 0-2 2v3M7 13a5 5 0 0 1 .5-2.2M12 7a6 6 0 0 0-6 6v3M17 13a5 5 0 0 0-1-3M12 14v3" />
          </svg>
        </button>

        {/* 0 */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => press('0')}
          className="pressable grid h-16 w-16 place-items-center rounded-2xl bg-white/70 text-2xl font-semibold text-ink-800 shadow-soft backdrop-blur-lg disabled:opacity-50 dark:bg-white/[0.07] dark:text-ink-100"
        >
          0
        </button>

        {/* Удалить */}
        <button
          type="button"
          disabled={disabled || value.length === 0}
          onClick={remove}
          aria-label={t('common.delete')}
          className="pressable grid h-16 w-16 place-items-center rounded-2xl bg-white/70 text-ink-600 shadow-soft backdrop-blur-lg disabled:opacity-40 dark:bg-white/[0.07] dark:text-ink-300"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 5H8l-5 7 5 7h13a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1zM12 9l6 6M18 9l-6 6" />
          </svg>
        </button>
      </div>
    </div>
  )
}
