/** Forme minimale d'une expédition client nécessaire au calcul (compatible avec la réponse de l'API). */
export interface SavingsShipment {
  status: string
  offer: { pricingMode: string; price: number }
  share?: { amount: number } | null
}

/**
 * Économies réalisées (règle proposée, à valider — décision 2) : pour un trajet au forfait partagé,
 * économie = prix du véhicule seul (forfait) − part payée par le client. 0 pour un tarif à la tonne.
 * Les expéditions annulées ne comptent pas.
 */
export function clientSavings(shipments: readonly SavingsShipment[]): number {
  return shipments.reduce(
    (sum, s) => (s.status !== 'annule' && s.offer.pricingMode === 'forfait' && s.share ? sum + Math.max(0, s.offer.price - s.share.amount) : sum),
    0,
  )
}
