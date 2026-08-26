import { forwardRef, type ButtonHTMLAttributes, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'

import { Spinner } from './Spinner'
import { cn } from '@/lib/cn'
import { haptics } from '@/lib/haptics'

type Variant = 'primary' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
  children?: ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-soft hover:shadow-lifted hover:from-brand-500 hover:to-brand-700',
  outline:
    'border border-ink-200 bg-white/70 text-ink-700 backdrop-blur-lg hover:border-brand-300 hover:bg-brand-50/70 dark:border-white/15 dark:bg-white/[0.06] dark:text-ink-200 dark:hover:border-brand-400/50 dark:hover:bg-brand-500/10',
  ghost:
    'text-ink-500 hover:bg-ink-100 hover:text-ink-700 dark:text-ink-400 dark:hover:bg-white/[0.07] dark:hover:text-ink-200',
  danger: 'bg-red-500 text-white hover:bg-red-600 dark:bg-red-600/90 dark:hover:bg-red-500',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm rounded-xl',
  md: 'h-11 px-5 text-sm rounded-xl',
  lg: 'h-12 px-6 text-base rounded-2xl',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', loading, fullWidth, disabled, className, children, onPointerDown, ...props },
    ref,
  ) => {
    const handlePointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
      haptics.tap()
      onPointerDown?.(e)
    }
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        onPointerDown={handlePointerDown}
        className={cn(
          'pressable inline-flex items-center justify-center gap-2 font-semibold outline-none',
          'focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-ink-950',
          'disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.97]',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          className,
        )}
        {...props}
      >
        {loading ? <Spinner size="sm" className={loadingClassName(variant)} /> : null}
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'

function loadingClassName(variant: Variant): string {
  return variant === 'primary' || variant === 'danger' ? 'border-white' : 'border-ink-400 dark:border-ink-300'
}