import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '@/features/auth/useAuth'
import { callApi } from '@/services/mutlogApi'
import { CallEngine, defaultRuntime, IDLE_STATE, type CallPeer, type CallState } from './callEngine'
import { CallOverlay } from './CallOverlay'
import { startRingtone } from './ringtone'

export interface CallContextValue {
  /** Ce navigateur permet-il les appels (WebRTC, micro, connexion sécurisée) ? */
  supported: boolean
  state: CallState
  /** Un appel est déjà en cours : aucun autre ne peut démarrer. */
  busy: boolean
  startCall: (peer: CallPeer) => void
}

const CallContext = createContext<CallContextValue | null>(null)
/** Accès aux appels depuis n'importe quel écran connecté ; `null` hors du fournisseur. */
export const useCall = () => useContext(CallContext)

const IDLE_POLL_MS = 5_000 // détection d'un appel entrant (onglet visible)
const HIDDEN_POLL_MS = 15_000 // onglet en arrière-plan : la sonnerie dure 45 s, on la voit à temps
const END_SCREEN_MS = 4_000

/**
 * Service d'appel vocal de l'application, monté une fois par espace connecté.
 * - surveille les appels entrants (interrogation légère du serveur) et fait sonner l'écran ;
 * - pilote le moteur WebRTC et affiche l'écran d'appel par-dessus l'application ;
 * - raccroche proprement à la fermeture de l'onglet.
 */
export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [state, setState] = useState<CallState>(IDLE_STATE)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const runtime = useMemo(() => defaultRuntime(), [])
  const supported = runtime !== null
  const [engine] = useState(() => new CallEngine({ api: callApi, runtime, onChange: setState, onRemoteStream: setRemoteStream }))
  const userId = user ? String(user.id) : null

  // Libère micro et connexion si l'application se démonte.
  useEffect(() => () => engine.dispose(), [engine])

  // Appels entrants : on interroge le serveur tant que personne n'est en communication.
  useEffect(() => {
    if (!userId || !supported) return
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const tick = async () => {
      if (!active) return
      if (engine.isIdle()) {
        try {
          const call = await callApi.current()
          if (active && call && engine.isIdle()) {
            if (call.direction === 'incoming' && call.status === 'ringing') engine.incoming(call)
            else engine.abandon(call) // appel resté ouvert (page rechargée) : l'audio ne peut pas reprendre
          }
        } catch { /* réseau ou session : on réessaie au prochain passage */ }
      }
      if (active) timer = setTimeout(() => void tick(), document.visibilityState === 'hidden' ? HIDDEN_POLL_MS : IDLE_POLL_MS)
    }
    void tick()
    return () => { active = false; clearTimeout(timer) }
  }, [userId, supported, engine])

  // Fermeture de l'onglet en pleine conversation : on prévient le serveur.
  useEffect(() => {
    const onHide = () => engine.onUnload()
    window.addEventListener('pagehide', onHide)
    return () => window.removeEventListener('pagehide', onHide)
  }, [engine])

  // Sonneries : appel entrant (deux tons + vibration) et attente côté appelant.
  const ringKind = state.phase === 'ringing' && state.direction === 'incoming' ? 'incoming' : (state.phase === 'starting' || state.phase === 'calling') ? 'outgoing' : null
  useEffect(() => (ringKind ? startRingtone(ringKind) : undefined), [ringKind])

  // Une conversation en cours compte comme une activité : sans cela, la déconnexion automatique (30 min d'inactivité) couperait un long appel.
  const inCall = state.phase === 'connecting' || state.phase === 'active'
  useEffect(() => {
    if (!inCall) return
    const id = setInterval(() => window.dispatchEvent(new Event('mousemove')), 60_000)
    return () => clearInterval(id)
  }, [inCall])

  // La fin d'appel (refusé, sans réponse, connexion perdue…) reste affichée quelques secondes.
  useEffect(() => {
    if (state.phase !== 'ended') return
    const timer = setTimeout(() => engine.reset(), END_SCREEN_MS)
    return () => clearTimeout(timer)
  }, [state.phase, engine])

  const startCall = useCallback((peer: CallPeer) => {
    if (userId && String(peer.id) === userId) return
    void engine.start(peer)
  }, [engine, userId])

  const value = useMemo<CallContextValue>(() => ({
    supported, state, busy: state.phase !== 'idle' && state.phase !== 'ended', startCall,
  }), [supported, state, startCall])

  return (
    <CallContext.Provider value={value}>
      {children}
      {state.phase !== 'idle' && (
        <CallOverlay
          state={state}
          remoteStream={remoteStream}
          onAccept={() => void engine.accept()}
          // Refuser ou raccrocher soi-même : retour immédiat à l'application (comme sur un téléphone).
          onDecline={() => { engine.decline(); engine.reset() }}
          onHangup={() => { engine.hangup(); engine.reset() }}
          onMute={() => engine.toggleMute()}
          onClose={() => engine.reset()}
        />
      )}
    </CallContext.Provider>
  )
}
