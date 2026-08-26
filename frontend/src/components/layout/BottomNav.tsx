import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'

import { cn } from '@/lib/cn'
import { haptics } from '@/lib/haptics'

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
    key: 'plan',
    labelKey: 'nav.plan',
    to: '/planner',
    icon: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0 -10 0M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0',
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

/** Нижняя навигация: приклеенная панель во всю ширину. */
export function BottomNav() {
  const { t } = useTranslation()

  return (
    <nav
      aria-label='Primary'
      className='fixed inset-x-0 bottom-0 z-30 border-t border-white/60 bg-white/80 backdrop-blur-2xl dark:border-white/10 dark:bg-ink-900/80'
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), var(--tg-safe-area-bottom, 0px))',
      }}
    >
      <div className='mx-auto flex w-full max-w-md items-stretch justify-around'>
        {ITEMS.map((item) => (
          <NavLink key={item.key} to={item.to} end={item.end}>
            {({ isActive }) => (
              <span
                onClick={() => haptics.navigation()}
                className={cn(
                  'pressable flex flex-1 cursor-pointer flex-col items-center gap-0.5 py-2.5 text-[0.65rem] font-semibold transition-colors',
                  isActive
                    ? 'text-brand-700 dark:text-brand-300'
                    : 'text-ink-400 hover:text-ink-700 dark:text-ink-500 dark:hover:text-ink-200',
                )}
              >
                <span
                  className={cn(
                    'mb-0.5 grid h-9 w-14 place-items-center rounded-full transition-colors',
                    isActive
                      ? 'bg-brand-50/80 dark:bg-brand-500/15'
                      : 'bg-transparent',
                  )}
                >
                  <svg
                    viewBox='0 0 24 24'
                    className='h-5 w-5'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  >
                    <path d={item.icon} />
                  </svg>
                </span>
                {t(item.labelKey)}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
