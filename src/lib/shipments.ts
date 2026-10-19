import type { RemoteTransport } from '@/types/remote'

/**
 * Économies réalisées (règle proposée, à valider — décision 2) : pour un trajet au forfait partagé,
 * économie = prix du véhicule seul (forfait) − part payée par le client. 0 pour un tarif à la tonne.
 */
export const clientSavings = (shipments: RemoteTransport[]): number =>
  shipments
    .filter((t) => t.status !== 'annule' && t.offer.pricingMode === 'forfait' && t.share)
    .reduce((sum, t) => sum + Math.max(0, t.offer.price - t.share!.amount), 0)

/** Date de fin d'une opération (événement « Terminé », sinon dernier événement). */
export const doneAt = (t: Pick<RemoteTransport, 'events'>) =>
  t.events.find((e) => e.label === 'Terminé')?.at ?? t.events[t.events.length - 1]?.at ?? ''
