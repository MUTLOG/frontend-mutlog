import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { fmtDate, fmtT } from '@/components/shared/ui-bits'
import { fillRate } from '@/domain/pooling'
import type { Offer, PoolingFinance } from '@/domain/types'

/** Champs d'une offre utilisés par la carte (une offre de la base locale ou de l'API convient). */
export type PoolingOffer = Pick<Offer, 'from' | 'to' | 'date' | 'totalCapacityT' | 'availableT'>
import { formatFCFA } from '@/lib/format'

export interface PoolingRow { key: string; label: string; weightT: number; payable?: number; detail?: string }

/** Écran « MUTUALISATION » (direction UI/UX §4) : trajet, camion, clients, total, taux de remplissage, prix, commission, actions. */
export function PoolingCard({ offer, vehicleLabel, rows, finance, status, actions, showNet = true }: {
  offer: PoolingOffer; vehicleLabel?: string; rows: PoolingRow[]; finance: PoolingFinance | null; status?: ReactNode; actions?: ReactNode; showNet?: boolean
}) {
  const total = rows.reduce((s, r) => s + r.weightT, 0)
  const rate = fillRate(total, offer.totalCapacityT)
  const over = total > offer.availableT + 1e-9
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Mutualisation</p>
          <h3 className="text-lg font-bold text-ink">{offer.from} → {offer.to}</h3>
          <p className="text-sm text-muted">{fmtDate(offer.date)} · {vehicleLabel ?? `Camion ${fmtT(offer.totalCapacityT)}`}</p>
        </div>
        {status}
      </div>

      <ul className="mt-4 divide-y divide-line rounded-control border border-line text-sm">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="min-w-0"><span className="font-medium text-ink">{r.label}</span>{r.detail && <span className="block truncate text-xs text-muted">{r.detail}</span>}</span>
            <span className="shrink-0 text-right"><span className="font-medium text-ink">{fmtT(r.weightT)}</span>{r.payable !== undefined && <span className="block text-xs text-muted">{formatFCFA(r.payable)}</span>}</span>
          </li>
        ))}
        <li className="flex items-center justify-between bg-background px-4 py-2.5 font-semibold text-ink"><span>Total</span><span className={over ? 'text-danger' : ''}>{total.toString().replace('.', ',')} / {offer.totalCapacityT} tonnes</span></li>
      </ul>

      <div className="mt-4">
        <div className="flex items-center justify-between text-sm"><span className="text-muted">Taux de remplissage</span><span className="font-semibold text-ink">{rate} %</span></div>
        <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={rate} aria-valuemin={0} aria-valuemax={100} aria-label="Taux de remplissage du camion">
          <div className={`h-full rounded-full ${over ? 'bg-danger' : 'bg-primary-2'}`} style={{ width: `${rate}%` }} />
        </div>
        <p className={`mt-1 text-xs ${over ? 'font-semibold text-danger' : 'text-muted'}`}>{over ? `Capacité disponible dépassée (${fmtT(offer.availableT)})` : `Capacité disponible : ${fmtT(offer.availableT)}`}</p>
      </div>

      {finance && (
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div><dt className="text-muted">Prix transport</dt><dd className="text-lg font-bold text-ink">{formatFCFA(finance.gross)}</dd></div>
          <div><dt className="text-muted">Commission MUTLOG ({finance.ratePct} %)</dt><dd className="text-lg font-bold text-ink">{formatFCFA(finance.commission)}</dd></div>
          {showNet && <div><dt className="text-muted">Revient au transporteur</dt><dd className="text-lg font-bold text-[#15803D]">{formatFCFA(finance.netCarrier)}</dd></div>}
        </dl>
      )}
      {actions && <div className="mt-5 flex flex-wrap gap-3">{actions}</div>}
    </Card>
  )
}

export const poolingStatusBadge = (s: string) => (
  <Badge tone={s === 'proposee' ? 'pending' : s === 'validee' ? 'info' : s === 'confirmee' ? 'success' : 'danger'}>
    {{ proposee: 'À valider', validee: 'Chez le transporteur', confirmee: 'Confirmé', refusee: 'Refusé', annulee: 'Annulé' }[s as 'proposee']}
  </Badge>
)
