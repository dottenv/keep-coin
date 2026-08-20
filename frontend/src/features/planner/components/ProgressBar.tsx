import { cn } from '@/lib/cn'

interface ProgressBarProps {
  /** 0..100; значения выше 100 считаются перерасходом. */
  value: number
  over?: boolean
  className?: string
}

/** Линейный прогресс с округлёнными концами. */
export function ProgressBar({ value, over, className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-white/10', className)}>
      <div
        className={cn(
          'h-full rounded-full transition-all duration-500',
          over
            ? 'bg-gradient-to-r from-rose-400 to-rose-500'
            : 'bg-gradient-to-r from-brand-400 to-brand-600',
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}