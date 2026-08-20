import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
}

/** Стеклянная карточка: полупрозрачная поверхность с размытием фона. */
export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[1.5rem] border border-white/60 bg-white/70 shadow-soft backdrop-blur-xl',
        'dark:border-white/10 dark:bg-white/[0.06] dark:shadow-[0_10px_40px_rgba(2,6,23,0.5)]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}