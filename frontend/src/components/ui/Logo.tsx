import { useId } from 'react'

import { cn } from '@/lib/cn'

interface LogoProps {
  /** Размер в пикселях (квадрат). */
  size?: number
  /** Плитка с заливкой-градиентом (иконка) или только монограмма (для шапки на фоне). */
  variant?: 'tile' | 'mark'
  className?: string
  /** Показывать подпись «Keep Coin» справа от плитки. */
  withWordmark?: boolean
  title?: string
}

/**
 * Фирменный знак Keep Coin — монограмма «KC» в стиле приложения
 * (градиент brand + стеклянный блик). Единый источник для шапки,
 * экрана блокировки, сплэша и манифеста.
 */
export function Logo({
  size = 40,
  variant = 'tile',
  className,
  withWordmark = false,
  title = 'Keep Coin',
}: LogoProps) {
  const gradientId = `kc-${useId().replace(/:/g, '')}`

  const mark = (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      className={cn(withWordmark && 'shrink-0', className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#34d399" />
          <stop offset="0.55" stop-color="#10b981" />
          <stop offset="1" stop-color="#059669" />
        </linearGradient>
      </defs>
      {variant === 'tile' ? (
        <rect width="512" height="512" rx="116" fill={`url(#${gradientId})`} />
      ) : null}
      <circle cx="168" cy="148" r="118" fill="#ffffff" opacity={variant === 'tile' ? 0.1 : 0} />
      <g
        fill="none"
        stroke={variant === 'tile' ? '#ffffff' : 'currentColor'}
        strokeWidth="50"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M150 150 V362" />
        <path d="M200 256 L300 150" />
        <path d="M200 256 L300 362" />
        <path d="M360 192 A78 78 0 1 0 360 320" />
      </g>
    </svg>
  )

  if (!withWordmark) return mark

  return (
    <span className="flex items-center gap-2.5">
      {mark}
      <span className="text-lg font-extrabold tracking-tight text-ink-900 dark:text-ink-50">
        Keep Coin
      </span>
    </span>
  )
}
