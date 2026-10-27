import { Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/useAuth'
import type { CallPeer } from './callEngine'
import { useCall } from './CallProvider'

/** Bouton « Appeler » : lance un appel vocal dans l'application, sans révéler le numéro de téléphone. */
export function CallButton({ peer, label = 'Appeler', size = 'sm', variant = 'outline', className }: {
  peer: CallPeer
  label?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'outline' | 'ghost'
  className?: string
}) {
  const call = useCall()
  const { user } = useAuth()
  if (!call || (user && String(user.id) === String(peer.id))) return null
  const title = !call.supported
    ? 'Les appels ne sont pas disponibles sur cet appareil ou ce navigateur (connexion sécurisée et micro requis).'
    : call.busy ? 'Un appel est déjà en cours.' : `Appeler ${peer.displayName}`
  return (
    <Button type="button" size={size} variant={variant} className={className} disabled={!call.supported || call.busy} title={title}
      aria-label={`Appeler ${peer.displayName}`} onClick={() => call.startCall(peer)}>
      <Phone className="h-4 w-4" aria-hidden="true" /> {label}
    </Button>
  )
}
