import { useTranslation } from 'react-i18next'

import { useToast } from '@/components/ui/Toast'

/** Заголовок секции с опциональной ссылкой-действием справа. */
export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string
  actionLabel?: string
  onAction?: () => void
}) {
  if (!actionLabel) {
    return (
      <h2 className="px-1 text-sm font-semibold text-ink-500 dark:text-ink-400">{title}</h2>
    )
  }
  return (
    <div className="flex items-center justify-between px-1">
      <h2 className="text-sm font-semibold text-ink-500 dark:text-ink-400">{title}</h2>
      <button
        type="button"
        onClick={onAction}
        className="pressable text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
      >
        {actionLabel}
      </button>
    </div>
  )
}

/** Стандартное «скоро» для ещё не реализованных разделов. */
export function useComingSoon() {
  const { t } = useTranslation()
  const toast = useToast()
  return () => toast.show(t('common.comingSoon'), 'info')
}