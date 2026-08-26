import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { cn } from '@/lib/cn'

interface SettingsGroupProps {
  title?: string
  children: ReactNode
  className?: string
}

/** Компактная группа настроек с заголовком и карточкой-списком. */
export function SettingsGroup({ title, children, className }: SettingsGroupProps) {
  return (
    <section className={cn('animate-fade-in-up', className)}>
      {title ? (
        <p className='mb-1.5 px-3 text-xs font-bold uppercase tracking-wide text-ink-400 dark:text-ink-500'>
          {title}
        </p>
      ) : null}
      <div className='glass-card divide-y divide-ink-100 overflow-hidden dark:divide-white/10'>
        {children}
      </div>
    </section>
  )
}

interface SettingsRowProps {
  icon?: ReactNode
  label: ReactNode
  hint?: ReactNode
  /** Контрол справа (тоггл, значение, сегмент). */
  control?: ReactNode
  /** Показать стрелку «дальше» (для строк-ссылок). */
  chevron?: boolean
  onClick?: () => void
  to?: string
  danger?: boolean
  disabled?: boolean
}

export function SettingsRow({
  icon,
  label,
  hint,
  control,
  chevron = false,
  onClick,
  to,
  danger = false,
  disabled = false,
}: SettingsRowProps) {
  const inner = (
    <>
      {icon ? (
        <span
          className={cn(
            'grid h-9 w-9 shrink-0 place-items-center rounded-xl',
            danger
              ? 'bg-red-500/10 text-red-600 dark:text-red-400'
              : 'bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400',
          )}
        >
          {icon}
        </span>
      ) : null}
      <span className='flex min-w-0 flex-1 flex-col'>
        <span
          className={cn(
            'truncate text-sm font-semibold',
            danger ? 'text-red-600 dark:text-red-400' : 'text-ink-800 dark:text-ink-100',
          )}
        >
          {label}
        </span>
        {hint ? (
          <span className='truncate text-xs text-ink-400'>{hint}</span>
        ) : null}
      </span>
      {control ? <span className='ml-3 shrink-0'>{control}</span> : null}
      {chevron ? (
        <svg
          viewBox='0 0 24 24'
          className='ml-3 h-4 w-4 shrink-0 text-ink-300 dark:text-ink-500'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        >
          <path d='M9 18l6-6-6-6' />
        </svg>
      ) : null}
    </>
  )

  const base = cn(
    'pressable flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors',
    disabled ? 'opacity-60' : 'hover:bg-ink-50/70 dark:hover:bg-white/[0.04]',
  )

  if (to) {
    return (
      <Link to={to} className={base}>
        {inner}
      </Link>
    )
  }

  return (
    <button type='button' onClick={onClick} disabled={disabled} className={base}>
      {inner}
    </button>
  )
}
