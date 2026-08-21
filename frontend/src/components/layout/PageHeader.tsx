import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

/** Шапка вторичной страницы: назад + заголовок + опциональное действие. */
export function PageHeader({
  title,
  subtitle,
  action,
  backTo,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  backTo?: string
}) {
  const navigate = useNavigate()
  return (
    <header className="mb-5 flex items-center gap-2 animate-fade-in">
      <button
        type="button"
        aria-label="Back"
        onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
        className="pressable -ml-1.5 grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-600 transition-colors hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-white/[0.07]"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-bold tracking-tight text-ink-900 dark:text-ink-100">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-0.5 truncate text-xs text-ink-400 dark:text-ink-500">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </header>
  )
}