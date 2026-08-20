import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

interface SkeletonProps extends HTMLAttributes<HTMLSpanElement> {
  className?: string
}

/** Блок-заглушка во время загрузки данных. */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return <span className={cn('skeleton block', className)} aria-hidden {...props} />
}

export function SkeletonText({ className }: { className?: string }) {
  return <Skeleton className={cn('h-4 w-24', className)} />
}