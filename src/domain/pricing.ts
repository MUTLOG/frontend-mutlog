import type { Offer, PoolingFinance, PoolingShare, Settings } from './types'

/** Répartit un montant entier (FCFA) au prorata de poids ; le reste est attribué selon la méthode du plus fort reste. */
export function splitAmount(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0)
  if (sum <= 0) return weights.map(() => 0)
  const raw = weights.map((w) => (total * w) / sum)
  const floors = raw.map(Math.floor)
  let rest = total - floors.reduce((a, b) => a + b, 0)
  const order = raw.map((v, i) => ({ i, frac: v - Math.floor(v) })).sort((a, b) => b.frac - a.frac)
  for (const { i } of order) {
    if (rest <= 0) break
    floors[i] += 1
    rest -= 1
  }
  return floors
}

/** Prix total du transport (CDC §12). */
export function transportTotal(offer: Pick<Offer, 'pricingMode' | 'price'>, totalWeightT: number): number {
  return offer.pricingMode === 'tonne' ? Math.round(offer.price * totalWeightT) : Math.round(offer.price)
}

/** Commission MUTLOG et net transporteur (CDC §13). */
export function computeFinance(
  gross: number,
  ratePct: number,
  bearer: Settings['commissionBearer'],
): PoolingFinance {
  const commission = Math.round((gross * ratePct) / 100)
  return { gross, ratePct, commission, netCarrier: bearer === 'transporteur' ? gross - commission : gross, bearer }
}

export interface ShareInput { requestId: string; clientId: string; weightT: number; volumeM3?: number }

/** Part de chaque client + montant à payer (selon qui supporte la commission). */
export function computeShares(
  total: number,
  items: ShareInput[],
  basis: Settings['shareBasis'],
  finance: PoolingFinance,
): PoolingShare[] {
  const useVolume = basis === 'volume' && items.every((i) => (i.volumeM3 ?? 0) > 0)
  const weights = items.map((i) => (useVolume ? (i.volumeM3 as number) : i.weightT))
  const amounts = splitAmount(total, weights)
  const commissionParts = finance.bearer === 'clients' ? splitAmount(finance.commission, weights) : weights.map(() => 0)
  return items.map((it, i) => ({
    requestId: it.requestId,
    clientId: it.clientId,
    weightT: it.weightT,
    amount: amounts[i],
    payable: amounts[i] + commissionParts[i],
  }))
}
