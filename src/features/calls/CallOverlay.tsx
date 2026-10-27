import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react'
import type { CallEndReason, CallState } from './callEngine'

const ROLE_LABEL: Record<string, string> = { client: 'Client', transporteur: 'Transporteur', admin: 'MUTLOG' }

const END_TEXT: Record<CallEndReason, string> = {
  hangup: 'Appel terminé',
  declined: 'Appel refusé',
  busy: 'Votre correspondant est déjà en communication.',
  missed: 'Pas de réponse',
  cancelled: 'Appel annulé',
  connection_lost: 'Connexion perdue',
  failed: 'La connexion audio a échoué. Vérifiez votre réseau et réessayez.',
  'no-microphone': 'Microphone inaccessible. Autorisez l\'accès au micro dans votre navigateur pour passer des appels.',
  unsupported: 'Les appels ne sont pas pris en charge sur cet appareil ou ce navigateur (connexion sécurisée et micro requis).',
  error: 'L\'appel n\'a pas pu aboutir.',
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || '?'
}

/** Chronomètre de conversation (mm:ss), actualisé chaque seconde. */
function CallTimer({ since }: { since: number }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const seconds = Math.max(0, Math.floor((now - since) / 1000))
  return <span>{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</span>
}

function RoundButton({ label, onClick, tone, pressed, children, autoFocus }: {
  label: string; onClick: () => void; tone: 'danger' | 'success' | 'neutral' | 'active'; pressed?: boolean; children: React.ReactNode; autoFocus?: boolean
}) {
  const tones = { danger: 'bg-danger text-white', success: 'bg-success text-white', neutral: 'bg-white/20 text-white', active: 'bg-white text-primary' }
  return (
    <div className="flex flex-col items-center gap-2">
      <button type="button" aria-label={label} aria-pressed={pressed} autoFocus={autoFocus} onClick={onClick}
        className={`flex h-16 w-16 items-center justify-center rounded-full shadow-lg transition active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${tones[tone]}`}>
        {children}
      </button>
      <span className="text-xs text-white/80" aria-hidden="true">{label}</span>
    </div>
  )
}

/** Écran d'appel plein écran : sonnerie, connexion, conversation, fin d'appel. */
export function CallOverlay({ state, remoteStream, onAccept, onDecline, onHangup, onMute, onClose }: {
  state: CallState
  remoteStream: MediaStream | null
  onAccept: () => void
  onDecline: () => void
  onHangup: () => void
  onMute: () => void
  onClose: () => void
}) {
  const audio = useRef<HTMLAudioElement>(null)
  useEffect(() => {
    if (audio.current) audio.current.srcObject = remoteStream
  }, [remoteStream])

  const name = state.peer?.displayName ?? 'Correspondant'
  const incoming = state.phase === 'ringing' && state.direction === 'incoming'
  const title = incoming ? 'Appel entrant' : state.phase === 'ended' ? '' : 'Appel vocal'
  const status = (() => {
    switch (state.phase) {
      case 'starting': return 'Préparation de l\'appel…'
      case 'calling': return 'Sonnerie…'
      case 'ringing': return state.peer?.role ? ROLE_LABEL[state.peer.role] ?? 'MUTLOG' : 'MUTLOG'
      case 'connecting': return 'Connexion…'
      case 'active': return state.connectedAt ? <CallTimer since={state.connectedAt} /> : 'En communication'
      case 'ended': return state.message && (state.endReason === 'busy' || state.endReason === 'error') ? state.message : END_TEXT[state.endReason ?? 'hangup']
      default: return ''
    }
  })()

  return (
    <div role="dialog" aria-modal="true" aria-label={incoming ? `Appel entrant de ${name}` : `Appel avec ${name}`}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-primary px-6 pb-14 pt-16 text-white">
      <div className="flex w-full max-w-sm flex-col items-center gap-3 text-center">
        {title && <p className="text-sm uppercase tracking-wide text-white/70">{title}</p>}
        <div aria-hidden="true" className="flex h-28 w-28 items-center justify-center rounded-full bg-white/15 text-4xl font-bold">{initials(name)}</div>
        <p className="text-2xl font-semibold">{name}</p>
        <p role="status" aria-live={incoming ? 'assertive' : 'polite'} className="min-h-[1.5rem] text-base text-white/85">{status}</p>
      </div>

      {state.phase === 'ended' ? (
        <button type="button" onClick={onClose} autoFocus className="rounded-control bg-white px-8 py-3 text-sm font-semibold text-primary">Fermer</button>
      ) : incoming ? (
        <div className="flex items-start gap-16">
          <RoundButton label="Refuser" tone="danger" onClick={onDecline}><PhoneOff className="h-7 w-7" aria-hidden="true" /></RoundButton>
          <RoundButton label="Répondre" tone="success" onClick={onAccept} autoFocus><Phone className="h-7 w-7" aria-hidden="true" /></RoundButton>
        </div>
      ) : (
        <div className="flex items-start gap-12">
          {(state.phase === 'active' || state.phase === 'connecting') && (
            <RoundButton label={state.muted ? 'Réactiver le micro' : 'Couper le micro'} tone={state.muted ? 'active' : 'neutral'} pressed={state.muted} onClick={onMute}>
              {state.muted ? <MicOff className="h-7 w-7" aria-hidden="true" /> : <Mic className="h-7 w-7" aria-hidden="true" />}
            </RoundButton>
          )}
          <RoundButton label="Raccrocher" tone="danger" onClick={onHangup} autoFocus><PhoneOff className="h-7 w-7" aria-hidden="true" /></RoundButton>
        </div>
      )}
      {/* Le son du correspondant : lancé par un geste de l'utilisateur (appel ou réponse), donc autorisé par les navigateurs. */}
      <audio ref={audio} autoPlay playsInline />
    </div>
  )
}
