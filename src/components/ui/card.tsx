import * as React from 'react'
import { cn } from '@/lib/utils'

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('rounded-card border border-line bg-surface shadow-card', className)} {...props} />
  ),
)
Card.displayName = 'Card'

export function CardHeader({
  title,
  action,
  className,
}: {
  title: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3 px-5 pt-5', className)}>
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {action}
    </div>
  )
}
