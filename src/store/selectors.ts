import type { Offer, Pooling, PoolingShare, Transport, TransportRequest } from '@/domain/types'
import type { Db } from './db'

export interface TransportView { t: Transport; p: Pooling; offer: Offer }

export function transportViews(db: Db): TransportView[] {
  return db.transports.flatMap((t) => {
    const p = db.poolings.find((x) => x.id === t.poolingId)
    const offer = db.offers.find((o) => o.id === t.offerId)
    return p && offer ? [{ t, p, offer }] : []
  })
}

export interface ClientTransport extends TransportView { share: PoolingShare; req?: TransportRequest }

export function clientTransports(db: Db, clientId: string): ClientTransport[] {
  return transportViews(db).flatMap((v) => {
    const share = v.p.shares.find((s) => s.clientId === clientId)
    return share ? [{ ...v, share, req: db.requests.find((r) => r.id === share.requestId) }] : []
  }).sort((a, b) => b.t.events[0].at.localeCompare(a.t.events[0].at))
}

export const carrierTransports = (db: Db, transporterId: string) =>
  transportViews(db).filter((v) => v.offer.transporterId === transporterId).sort((a, b) => b.t.events[0].at.localeCompare(a.t.events[0].at))

/**
 * Économies réalisées (règle proposée, à valider — décision 2) : pour un trajet au forfait partagé,
 * économie = prix du véhicule seul (forfait) − part payée par le client. 0 pour un tarif à la tonne.
 */
export function clientSavings(db: Db, clientId: string): number {
  return clientTransports(db, clientId)
    .filter((v) => v.t.status !== 'annule' && v.offer.pricingMode === 'forfait')
    .reduce((s, v) => s + Math.max(0, v.offer.price - v.share.amount), 0)
}

export const doneAt = (t: Transport) => t.events.find((e) => e.label === 'Terminé')?.at ?? t.events[t.events.length - 1].at

/** Revenus nets du transporteur par mois (opérations terminées), sur les `months` derniers mois. */
export function monthlyNet(db: Db, transporterId: string, months = 6): { label: string; value: number }[] {
  const out: { key: string; label: string; value: number }[] = []
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''), value: 0 })
  }
  carrierTransports(db, transporterId).filter((v) => v.t.status === 'terminee').forEach((v) => {
    const d = new Date(doneAt(v.t))
    const slot = out.find((o) => o.key === `${d.getFullYear()}-${d.getMonth()}`)
    const c = db.commissions.find((x) => x.transportId === v.t.id)
    if (slot && c) slot.value += c.netCarrier
  })
  return out
}
