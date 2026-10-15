import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { OPERATION_STEPS, toDisplayStep, type OperationStatus } from '@/types/operation'

/** Suivi d'une opération (CDC §6). Vertical par défaut sur mobile, horizontal à partir de md. */
export function StatusStepper({ status, className }: { status: OperationStatus; className?: string }) {
  const current = toDisplayStep(status)
  const currentIndex = current ? OPERATION_STEPS.findIndex((s) => s.key === current) : -1

  if (status === 'annule') {
    return (
      <p className={cn('rounded-control bg-danger-soft px-4 py-3 text-sm font-medium text-danger', className)} role="status">
        Cette opération a été annulée.
      </p>
    )
  }

  return (
    <ol className={cn('flex flex-col gap-0 md:flex-row md:items-start', className)} aria-label="Étapes de l'opération">
      {OPERATION_STEPS.map((step, i) => {
        const done = i < currentIndex
        const active = i === currentIndex
        const last = i === OPERATION_STEPS.length - 1
        return (
          <li
            key={step.key}
            className="relative flex flex-1 gap-3 pb-5 last:pb-0 md:flex-col md:items-center md:gap-2 md:pb-0 md:text-center"
            aria-current={active ? 'step' : undefined}
          >
            {!last && (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute left-[15px] top-8 h-[calc(100%-1rem)] w-0.5 md:left-1/2 md:top-[15px] md:h-0.5 md:w-full',
                  done ? 'bg-primary' : 'bg-line',
                )}
              />
            )}
            <span
              className={cn(
                'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold',
                done && 'border-primary bg-primary text-white',
                active && 'border-accent bg-surface text-accent ring-4 ring-accent-soft',
                !done && !active && 'border-line bg-surface text-muted',
              )}
            >
              {done ? <Check className="h-4 w-4" aria-hidden="true" /> : i + 1}
            </span>
            <span className={cn('pt-1 text-sm md:pt-0', active ? 'font-semibold text-ink' : done ? 'text-ink' : 'text-muted')}>
              {step.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
