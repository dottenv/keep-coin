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

const MAX_VISIBLE = 4
const VISIBLE_MS = 4000
const EXIT_MS = 220

const toneClasses: Record<Tone, string> = {
  success:
    'border-brand-200/70 bg-brand-50/85 text-brand-800 backdrop-blur-2xl dark:border-brand-400/30 dark:bg-brand-500/20 dark:text-brand-100',
  error:
    'border-red-200/70 bg-red-50/85 text-red-700 backdrop-blur-2xl dark:border-red-400/30 dark:bg-red-500/20 dark:text-red-100',
  info: 'glass-chip text-ink-700 dark:text-ink-100',
}

const toneDot: Record<Tone, string> = {
  success: 'bg-brand-500',
  error: 'bg-red-500',
  info: 'bg-ink-400 dark:bg-ink-300',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [leaving, setLeaving] = useState<Set<number>>(new Set())
  const nextId = useRef(0)
  const timers = useRef<Map<number, number>>(new Map())

  const remove = useCallback((id: number) => {
    setToasts((items) => items.filter((t) => t.id !== id))
    setLeaving((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    const handle = timers.current.get(id)
    if (handle) {
      window.clearTimeout(handle)
      timers.current.delete(id)
    }
  }, [])

  const dismiss = useCallback(
    (id: number) => {
      // Запускаем плавное исчезновение, затем удаляем из дерева.
      setLeaving((prev) => new Set(prev).add(id))
      const handle = window.setTimeout(() => remove(id), EXIT_MS)
      timers.current.set(id, handle)
    },
    [remove],
  )

  const show = useCallback(
    (message: string, tone: Tone = 'info') => {
      const id = ++nextId.current
      setToasts((items) => [{ id, tone, message }, ...items].slice(0, MAX_VISIBLE))
      const handle = window.setTimeout(() => dismiss(id), VISIBLE_MS)
      timers.current.set(id, handle)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        // Под Dynamic Island: минимум 56px, иначе — отступ под статус-бар.
        style={{ top: 'max(56px, calc(env(safe-area-inset-top, 0px) + 14px))' }}
        className="pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((toast) => {
          const isLeaving = leaving.has(toast.id)
          return (
            <button
              key={toast.id}
              onClick={() => dismiss(toast.id)}
              className={cn(
                'pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium shadow-soft',
                isLeaving ? 'animate-toast-out' : 'animate-toast-in',
                toneClasses[toast.tone],
              )}
            >
              <span
                className={cn('h-2.5 w-2.5 shrink-0 rounded-full', toneDot[toast.tone])}
              />
              <span className="min-w-0 flex-1 leading-snug">{toast.message}</span>
            </button>
          )
        })}
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
