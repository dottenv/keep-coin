import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'

import { cn } from '@/lib/cn'

interface NavItem {
  key: string
  labelKey: string
  to: string
  icon: string
  end?: boolean
}

const ITEMS: NavItem[] = [
  {
    key: 'home',
    labelKey: 'nav.home',
    to: '/',
    icon: 'M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5',
    end: true,
  },
  {
    key: 'stats',
    labelKey: 'nav.stats',
    to: '/stats',
    icon: 'M3 21v-6M9 21v-9M15 21V7M21 21V3',
  },
  {
    key: 'accounts',
    labelKey: 'nav.accounts',
    to: '/accounts',
    icon: 'M3 6h18v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM3 10h18',
  },
  {
    key: 'profile',
    labelKey: 'nav.profile',
    to: '/profile',
    icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  },
]

/** Нижняя навигация: летающая, скруглённая. */
export function BottomNav() {
  const { t } = useTranslation()

  return (
    <nav
      aria-label="Primary"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4"
    >
      <div         className="pointer-events-auto flex w-full max-w-md items-center justify-around rounded-[1.75rem] border border-white/60 bg-white/80 p-2 shadow-lifted backdrop-blur-xl animate-fade-in-up dark:border-white/10 dark:bg-ink-900/60 dark:shadow-[0_10px_40px_rgba(2,6,23,0.5)] ultra:border-emerald-400/30 ultra:bg-emerald-950/40 ultra:shadow-[0_0_30px_rgba(16,185,129,0.25)]">
        {ITEMS.map((item) => (
          <NavLink
            key={item.key}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'pressable flex flex-col items-center gap-0.5 rounded-2xl px-3.5 py-1.5 text-[0.65rem] font-semibold transition-colors',
                isActive
                  ? 'bg-brand-50/80 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300 ultra:bg-emerald-400/20 ultra:text-emerald-200 ultra:shadow-[0_0_18px_rgba(16,185,129,0.35)]'
                  : 'text-ink-400 hover:text-ink-700 dark:hover:text-ink-200',
              )
            }
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={item.icon} />
            </svg>
            {t(item.labelKey)}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}