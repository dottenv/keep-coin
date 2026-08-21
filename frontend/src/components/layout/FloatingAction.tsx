import { useCallback, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { cn } from '@/lib/cn'

const HOLD_MS = 600

interface FabAction {
  type: 'income' | 'expense' | 'transfer'
  labelKey: string
  className: string
  icon: string
}

const ACTIONS: FabAction[] = [
  {
    type: 'income',
    labelKey: 'fab.addIncome',
    className: 'from-emerald-500 to-emerald-600',
    icon: 'M12 19V5M5 12l7-7 7 7',
  },
  {
    type: 'expense',
    labelKey: 'fab.addExpense',
    className: 'from-rose-500 to-rose-600',
    icon: 'M12 5v14M5 12l7 7 7-7',
  },
  {
    type: 'transfer',
    labelKey: 'fab.transfer',
    className: 'from-sky-500 to-sky-600',
    icon: 'M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4',
  },
]

/**
 * Плавающая кнопка действия.
 * — Короткое нажатие: раскрывает меню (Доход / Расход / Перевод).
 * — Долгое нажатие (600 мс): сразу открывает форму расхода по умолчанию.
 */
export function FloatingAction() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [open, setOpen] = useState(false)
  const [holding, setHolding] = useState(false)
  const holdTimer = useRef<number | null>(null)
  const longFired = useRef(false)
  const activePointer = useRef<number | null>(null)

  const close = useCallback(() => setOpen(false), [])

  const clearHoldTimer = () => {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
  }

  /**
   * На тач-устройствах `pressable:active` (scale 0.97) может «увести» палец
   * за границы кнопки и спровоцировать onPointerLeave. Pointer capture
   * привязывает события к кнопке, пока палец не поднят, — ловим только
   * «свой» pointerId, чтобы меню не открывалось и тут же не закрывалось.
   */
  const startHold = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (activePointer.current !== null) return
    activePointer.current = e.pointerId
    e.currentTarget.setPointerCapture?.(e.pointerId)
    longFired.current = false
    setHolding(true)
    holdTimer.current = window.setTimeout(() => {
      longFired.current = true
      setHolding(false)
      setOpen(false)
      navigate('/add?type=expense')
    }, HOLD_MS)
  }

  const endHold = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.pointerId !== activePointer.current) return
    activePointer.current = null
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture?.(e.pointerId)
    }
    setHolding(false)
    clearHoldTimer()
    if (!longFired.current) {
      setOpen((value) => !value)
    }
  }

  // Прерывание (палец ушёл/отключился) — без переключения меню.
  const cancelHold = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.pointerId !== activePointer.current) return
    activePointer.current = null
    setHolding(false)
    clearHoldTimer()
  }

  const onAction = (action: FabAction) => {
    setOpen(false)
    navigate(`/add?type=${action.type}`)
  }

  return (
    <>
      {/* затемнение-кликер для закрытия меню */}
      {open ? (
        <div
          className="fixed inset-0 z-30 bg-ink-900/10 backdrop-blur-[1px] animate-fade-in dark:bg-black/40"
          onClick={close}
          aria-hidden
        />
      ) : null}

      <div className="fixed right-4 z-40 flex flex-col items-end" style={{ bottom: 'calc(5.5rem + 12px)' }}>
        {/* выпадающие кнопки */}
        {open ? (
          <div className="mb-3 flex flex-col items-end gap-2.5">
            {ACTIONS.map((action, index) => (
              <button
                key={action.type}
                type="button"
                onClick={() => onAction(action)}
                className="pressable flex items-center gap-2.5 rounded-full bg-white/85 py-2 pr-4 pl-2 text-sm font-semibold text-ink-800 shadow-lifted ring-1 ring-ink-100 backdrop-blur-xl animate-fade-in-up dark:bg-ink-900/80 dark:text-ink-100 dark:ring-white/10 ultra:ring-white/20"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <span
                  className={cn(
                    'grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br text-white shadow-soft',
                    action.className,
                  )}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={action.icon} />
                  </svg>
                </span>
                {t(action.labelKey)}
              </button>
            ))}
          </div>
        ) : null}

        {/* основная кнопка */}
        <button
          type="button"
          aria-label={t('fab.add')}
          aria-expanded={open}
          onPointerDown={startHold}
          onPointerUp={endHold}
          onPointerLeave={cancelHold}
          onPointerCancel={cancelHold}
          onContextMenu={(e) => e.preventDefault()}
          className={cn(
            'pressable relative grid h-14 w-14 touch-none select-none place-items-center rounded-full text-white shadow-lifted',
            'bg-gradient-to-br from-brand-500 to-brand-700',
            open && 'rotate-45',
            'transition-transform duration-200',
          )}
        >
          {holding ? (
            <span className="absolute inset-0 animate-ping rounded-full bg-white/40" aria-hidden />
          ) : null}
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={open ? 'M6 6l12 12M18 6L6 18' : 'M12 5v14M5 12h14'} />
          </svg>
        </button>
      </div>
    </>
  )
}