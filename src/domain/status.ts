import type { OperationStatus } from '@/types/operation'

/** Transitions autorisées d'une opération de transport (CDC §6 et §15). */
const NEXT: Partial<Record<OperationStatus, OperationStatus[]>> = {
  demande: ['recherche', 'annule'],
  recherche: ['mutualisation', 'confirmee', 'annule'],
  mutualisation: ['confirmee', 'recherche', 'annule'],
  confirmee: ['en_cours', 'annule'],
  en_cours: ['arrive_destination', 'annule'],
  arrive_destination: ['livree'],
  livree: ['terminee'],
}

export function canTransition(from: OperationStatus, to: OperationStatus): boolean {
  return NEXT[from]?.includes(to) ?? false
}

export function nextStatuses(from: OperationStatus): OperationStatus[] {
  return NEXT[from] ?? []
}

export const STATUS_LABEL: Record<OperationStatus, string> = {
  demande: 'Demande créée',
  recherche: 'En recherche de transport',
  mutualisation: 'Mutualisation en cours',
  confirmee: 'Transport confirmé',
  en_cours: 'Transport en cours',
  arrive_destination: 'Arrivé à destination',
  livree: 'Livré',
  terminee: 'Terminé',
  annule: 'Annulé',
}

/** Identifiant unique d'opération, ex. MUT-2026-000125 (CDC §15). */
export function operationRef(year: number, seq: number): string {
  return `MUT-${year}-${String(seq).padStart(6, '0')}`
}
