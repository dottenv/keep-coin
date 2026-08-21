import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
}

/** Стеклянная карточка: полупрозрачная поверхность с размытием фона.
 *  Базируется на классе `.glass-card`, чтобы в теме Ultra получала
 *  единое неоновое оформление вместе со всеми остальными поверхностями. */
export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn('glass-card', className)}
      {...props}
    >
      {children}
    </div>
  )
}