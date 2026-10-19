/** Taux de remplissage en % (capacité réservée / capacité publiée). */
export function fillRate(usedT: number, capacityT: number): number {
  return capacityT <= 0 ? 0 : Math.min(100, Math.round((usedT / capacityT) * 100))
}
