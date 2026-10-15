/**
 * Cycle d'une opération — cahier des charges §6 (7 étapes affichées)
 * et §15 (statuts internes complémentaires).
 *
 * Décision (point 6, à confirmer) : le composant visuel affiche les 7 étapes du §6.
 * « Arrivé à destination » est un sous-statut de « En cours » ;
 * « Annulé » est un état terminal hors parcours.
 */
export const OPERATION_STEPS = [
  { key: 'demande', label: 'Demande' },
  { key: 'recherche', label: 'Recherche' },
  { key: 'mutualisation', label: 'Mutualisation' },
  { key: 'confirmee', label: 'Confirmée' },
  { key: 'en_cours', label: 'En cours' },
  { key: 'livree', label: 'Livrée' },
  { key: 'terminee', label: 'Terminée' },
] as const

export type OperationStep = (typeof OPERATION_STEPS)[number]['key']
export type OperationStatus = OperationStep | 'arrive_destination' | 'annule'

/** Étape affichée dans le stepper pour un statut donné. */
export function toDisplayStep(status: OperationStatus): OperationStep | null {
  if (status === 'annule') return null
  if (status === 'arrive_destination') return 'en_cours'
  return status
}
