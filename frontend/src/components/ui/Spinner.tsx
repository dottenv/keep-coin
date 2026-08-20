import { cn } from '@/lib/cn'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[3px]',
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="loading"
      className={cn(
        'inline-block animate-spin rounded-full border-ink-300 border-t-transparent',
        sizeClasses[size],
        className,
      )}
    />
  )
}

/** Центрированный спиннер на весь доступный блок. */
export function LoadingBlock({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-ink-400 animate-fade-in">
      <Spinner size="lg" className="border-brand-200 border-t-brand-500" />
      {label ? <p className="text-sm">{label}</p> : null}
    </div>
  )
}