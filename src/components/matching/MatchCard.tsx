import { Check } from 'lucide-react'
import type { Offer } from '@/domain/types'
import { fmtDate, fmtT } from '@/components/shared/ui-bits'
import type { ReactNode } from 'react'

/** Carte « Correspondances trouvées » (direction UI/UX §3) : score, trajet, camion, capacité, critères validés. */
export interface MatchCardData {
  offer: Pick<Offer, 'from' | 'to' | 'date' | 'totalCapacityT' | 'availableT'>
  score: number
  compatible?: boolean
  criteria: Array<{ key: string; label: string }>
}

export function MatchCard({ m, transporter, price, actions }: { m: MatchCardData; transporter?: string; price?: string; actions: ReactNode }) {
  const o = m.offer
  return (
    <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-start">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-success-soft text-lg font-bold text-[#15803D]" aria-label={`Compatibilité ${m.score} %`}>{m.score}%</div>
      <div className="min-w-0 flex-1 text-sm">
        <p className="text-base font-semibold text-ink">{o.from} → {o.to}</p>
        <p className="text-muted">{fmtDate(o.date)}</p>
        <p className="mt-1 text-ink">Camion : {fmtT(o.totalCapacityT)} <span className="text-muted">·</span> Disponible : <strong>{fmtT(o.availableT)}</strong></p>
        {(transporter || price) && <p className="text-muted">{[transporter, price].filter(Boolean).join(' · ')}</p>}
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-[#15803D]">
          {m.criteria.map((c) => <li key={c.key} className="flex items-center gap-1"><Check className="h-3.5 w-3.5" aria-hidden="true" />{c.label}</li>)}
        </ul>
      </div>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </div>
  )
}
