import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { cn } from '@/lib/cn'

type Tone = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  tone: Tone
  message: string
}

export interface ToastContextValue {
  show: (message: string, tone?: Tone) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const toneClasses: Record<Tone, string> = {
  success:
    'border-brand-200/70 bg-brand-50/80 text-brand-800 backdrop-blur-xl dark:border-brand-400/30 dark:bg-brand-500/15 dark:text-brand-200',
  error:
    'border-red-200/70 bg-red-50/80 text-red-700 backdrop-blur-xl dark:border-red-400/30 dark:bg-red-500/15 dark:text-red-200',
  info: 'glass-chip text-ink-700 dark:text-ink-200',
}

const toneDot: Record<Tone, string> = {
  success: 'bg-brand-500',
  error: 'bg-red-500',
  info: 'bg-ink-400 dark:bg-ink-400',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((items) => items.filter((t) => t.id !== id))
  }, [])

  const show = useCallback(
    (message: string, tone: Tone = 'info') => {
      const id = ++nextId.current
      setToasts((items) => [...items.slice(-2), { id, tone, message }])
      window.setTimeout(() => dismiss(id), 3500)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((toast) => (
          <button
            key={toast.id}
            onClick={() => dismiss(toast.id)}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-xl border px-4 py-3 text-left text-sm font-medium shadow-soft animate-toast-in',
              toneClasses[toast.tone],
            )}
          >
            <span className={cn('h-2 w-2 shrink-0 rounded-full', toneDot[toast.tone])} />
            {toast.message}
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}