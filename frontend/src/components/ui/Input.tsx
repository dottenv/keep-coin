import { forwardRef, type SelectHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

function FieldWrapper({
  label,
  hint,
  error,
  children,
}: {
  label?: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      {label ? (
        <span className="block text-sm font-medium text-ink-600 dark:text-ink-300">{label}</span>
      ) : null}
      {children}
      {error ? (
        <span className="block text-xs font-medium text-red-500 animate-fade-in">{error}</span>
      ) : hint ? (
        <span className="block text-xs text-ink-400 dark:text-ink-400">{hint}</span>
      ) : null}
    </label>
  )
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  leftSlot?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, leftSlot, className, ...props }, ref) => {
    return (
      <FieldWrapper label={label} hint={hint} error={error}>
        <div className="relative">
          {leftSlot ? (
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-400 dark:text-ink-400">
              {leftSlot}
            </span>
          ) : null}
          <input
            ref={ref}
            className={cn(
              'h-11 w-full rounded-xl border bg-white/80 px-4 text-sm text-ink-900 outline-none backdrop-blur transition-all duration-200',
              'placeholder:text-ink-300 dark:bg-white/[0.07] dark:text-ink-100 dark:placeholder:text-ink-500',
              leftSlot ? 'pl-10' : undefined,
              error
                ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:border-red-500/60 dark:focus:ring-red-500/20'
                : 'border-ink-200 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:border-white/15 dark:focus:ring-brand-500/20',
              className,
            )}
            {...props}
          />
        </div>
      </FieldWrapper>
    )
  },
)
Input.displayName = 'Input'

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string }
>(({ label, error, className, children, ...props }, ref) => {
  return (
    <FieldWrapper label={label} error={error}>
      <select
        ref={ref}
        className={cn(
          'h-11 w-full rounded-xl border border-ink-200 bg-white/80 px-4 text-sm text-ink-900 outline-none backdrop-blur transition-all duration-200',
          'focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:border-white/15 dark:bg-white/[0.07] dark:text-ink-100 dark:focus:ring-brand-500/20',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </FieldWrapper>
  )
})
Select.displayName = 'Select'