import { useEffect, useRef, useState } from 'react'

interface AnimatedNumberProps {
  value: number
  format?: (value: number) => string
  duration?: number
  className?: string
}

/** Плавная «накрутка» чисел от 0 (или предыдущего значения) до нового. */
export function AnimatedNumber({
  value,
  format = (v) => String(v),
  duration = 650,
  className,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0)
  const fromRef = useRef(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const from = fromRef.current
    if (from === value) {
      setDisplay(value)
      return
    }
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(from + (value - from) * eased)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = value
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [value, duration])

  return <span className={className}>{format(display)}</span>
}