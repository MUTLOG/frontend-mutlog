import type { LucideIcon } from 'lucide-react'
import { Card } from './card'
import { cn } from '@/lib/utils'

type Tone = 'info' | 'success' | 'accent' | 'danger'

const tones: Record<Tone, { tile: string; sub: string }> = {
  info: { tile: 'bg-info-soft text-[#1D4ED8]', sub: 'text-muted' },
  success: { tile: 'bg-success-soft text-[#15803D]', sub: 'text-[#15803D]' },
  accent: { tile: 'bg-accent-soft text-accent', sub: 'text-muted' },
  danger: { tile: 'bg-danger-soft text-danger', sub: 'text-muted' },
}

/** Carte indicateur des tableaux de bord (icône, libellé, valeur, précision). */
export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = 'info',
  subTone,
}: {
  icon: LucideIcon
  label: string
  value: string
  sub?: string
  tone?: Tone
  subTone?: 'success' | 'muted'
}) {
  return (
    <Card className="p-3 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', tones[tone].tile)}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted">{label}</p>
          <p className="mt-1 text-xl font-bold leading-none text-ink sm:text-2xl">{value}</p>
          {sub && (
            <p className={cn('mt-1.5 text-xs font-medium', subTone === 'muted' ? 'text-muted' : tones[tone].sub)}>
              {sub}
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}
