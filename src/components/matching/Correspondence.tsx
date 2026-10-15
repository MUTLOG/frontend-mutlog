import { Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Offer } from '@/domain/types'
import { fmtDate, fmtT } from '@/components/shared/ui-bits'

/** « Correspondance trouvée » (CDC §10) : une offre et le nombre de demandes compatibles. */
export function Correspondence({ offer, count, action }: { offer: Offer; count: number; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-card border border-success/30 bg-success-soft/60 p-4 sm:flex-row sm:items-center">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success text-white"><Sparkles className="h-5 w-5" aria-hidden="true" /></span>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold text-ink">Correspondance trouvée</p>
        <p className="text-ink">{offer.from} → {offer.to} · Date : {fmtDate(offer.date)}</p>
        <p className="text-muted">Camion : {fmtT(offer.totalCapacityT)} · Capacité disponible : {fmtT(offer.availableT)}</p>
        <p className="mt-0.5 font-semibold text-[#166534]">{count} demande{count > 1 ? 's' : ''} compatible{count > 1 ? 's' : ''}</p>
      </div>
      {action}
    </div>
  )
}
