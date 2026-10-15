import { Badge } from '@/components/ui/badge'
import type { OperationStatus } from '@/types/operation'

const map: Record<OperationStatus, { label: string; tone: React.ComponentProps<typeof Badge>['tone'] }> = {
  demande: { label: 'En attente', tone: 'pending' },
  recherche: { label: 'Recherche en cours', tone: 'info' },
  mutualisation: { label: 'Mutualisation', tone: 'info' },
  confirmee: { label: 'Confirmé', tone: 'success' },
  en_cours: { label: 'En transit', tone: 'info' },
  arrive_destination: { label: 'Arrivé', tone: 'info' },
  livree: { label: 'Livré', tone: 'success' },
  terminee: { label: 'Terminé', tone: 'success' },
  annule: { label: 'Annulé', tone: 'danger' },
}

export function StatusBadge({ status }: { status: OperationStatus }) {
  const { label, tone } = map[status]
  return <Badge tone={tone}>{label}</Badge>
}
