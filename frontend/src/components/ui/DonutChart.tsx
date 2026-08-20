import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

export interface DonutSegment {
  value: number
  color: string
}

interface DonutChartProps {
  segments: DonutSegment[]
  size?: number
  thickness?: number
  centerValue: ReactNode
  centerLabel?: ReactNode
  className?: string
  trackClassName?: string
}

/** Кольцевая диаграмма («бублик») на чистом SVG. */
export function DonutChart({
  segments,
  size = 180,
  thickness = 26,
  centerValue,
  centerLabel,
  className,
  trackClassName,
}: DonutChartProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  let acc = 0

  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth={thickness}
          className={cn('dark:stroke-white/10', trackClassName)}
        />
        {total > 0
          ? segments.map((segment, index) => {
              const fraction = segment.value / total
              const dash = circumference * fraction
              const offset = circumference * acc
              acc += fraction
              return (
                <circle
                  key={index}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={thickness}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                  style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}
                />
              )
            })
          : null}
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-2xl font-bold tabular-nums text-ink-900 dark:text-ink-100">{centerValue}</div>
          {centerLabel ? <div className="mt-0.5 text-xs text-ink-400">{centerLabel}</div> : null}
        </div>
      </div>
    </div>
  )
}