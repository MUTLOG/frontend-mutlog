import type { Offer, TransportRequest } from './types'

/**
 * Sélectionne le regroupement de demandes qui remplit le mieux la capacité disponible
 * sans la dépasser (sac à dos 0/1, au kg près). Départage : plus de demandes, puis date la plus proche.
 */
export function suggestPooling(offer: Pick<Offer, 'availableT' | 'date'>, candidates: TransportRequest[]): TransportRequest[] {
  const cap = Math.floor(offer.availableT * 1000)
  const items = candidates
    .map((r) => ({ r, w: Math.round(r.weightT * 1000) }))
    .filter((i) => i.w > 0 && i.w <= cap)
    .sort((a, b) => Math.abs(Date.parse(a.r.date) - Date.parse(offer.date)) - Math.abs(Date.parse(b.r.date) - Date.parse(offer.date)))

  // best[c] = { weight, picked indices } avec poids total exactement c ; on prend le meilleur c ≤ cap.
  const best: (number[] | null)[] = new Array(cap + 1).fill(null)
  best[0] = []
  for (let idx = 0; idx < items.length; idx++) {
    for (let c = cap; c >= items[idx].w; c--) {
      const prev = best[c - items[idx].w]
      if (prev && (!best[c] || prev.length + 1 > best[c]!.length)) best[c] = [...prev, idx]
    }
  }
  for (let c = cap; c >= 0; c--) if (best[c] && best[c]!.length) return best[c]!.map((i) => items[i].r)
  return []
}

export function fillRate(usedT: number, capacityT: number): number {
  return capacityT <= 0 ? 0 : Math.min(100, Math.round((usedT / capacityT) * 100))
}
