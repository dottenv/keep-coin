import { useTranslation } from 'react-i18next'

import { setLanguage } from '@/i18n'
import { cn } from '@/lib/cn'

export function LanguageToggle({ className }: { className?: string }) {
  const { i18n } = useTranslation()

  const options = [
    { code: 'ru', label: 'RU' },
    { code: 'en', label: 'EN' },
  ] as const

  return (
    <div
      className={cn(
        'glass-chip inline-flex items-center rounded-xl p-1',
        className,
      )}
      role="group"
      aria-label="Language"
    >
      {options.map((opt) => {
        const active = i18n.language.startsWith(opt.code)
        return (
          <button
            key={opt.code}
            type="button"
            onClick={() => setLanguage(opt.code)}
            className={cn(
              'pressable rounded-lg px-3 py-1 text-xs font-bold transition-colors duration-200',
              active
                ? 'bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-soft'
                : 'text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-200',
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}