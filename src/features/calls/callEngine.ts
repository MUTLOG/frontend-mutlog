import { ApiError } from '@/services/api'
import type { CallInfo, IceServerDto } from '@/services/mutlogApi'

/**
 * Moteur d'appel vocal (WebRTC), indépendant de React.
 *
 * Signalisation : le serveur ne fait que relayer deux descriptions de session (SDP) par interrogation régulière —
 * l'offre de l'appelant, jointe à la création de l'appel, et la réponse du destinataire, jointe à l'acceptation.
 * Chaque description est envoyée COMPLÈTE (on attend la fin de la collecte des candidats ICE) : pas d'échange de
 * candidats au fil de l'eau, donc aucune course entre sonnerie et réponse. L'audio circule ensuite de pair à pair.
 */
export type CallPhase = 'idle' | 'starting' | 'calling' | 'ringing' | 'connecting' | 'active' | 'ended'
export type CallEndReason = 'hangup' | 'declined' | 'busy' | 'missed' | 'cancelled' | 'connection_lost' | 'failed' | 'no-microphone' | 'unsupported' | 'error'

export interface CallPeer { id: string | number; displayName: string; role?: string }
export interface CallState {
  phase: CallPhase
  direction?: 'outgoing' | 'incoming'
  callId?: string | number
  peer?: CallPeer
  muted: boolean
  /** Instant (ms) où l'audio s'est établi : sert au chronomètre. */
  connectedAt?: number
  endReason?: CallEndReason
  /** Message du serveur à afficher tel quel (ex. correspondant déjà en ligne). */
  message?: string
}
export const IDLE_STATE: CallState = { phase: 'idle', muted: false }

export interface CallApi {
  iceServers(): Promise<IceServerDto[]>
  start(input: { toId: string | number; offer: string }): Promise<CallInfo>
  show(id: string | number): Promise<CallInfo>
  accept(id: string | number, answer: string): Promise<CallInfo>
  decline(id: string | number): Promise<CallInfo>
  end(id: string | number): Promise<CallInfo>
  endOnUnload(id: string | number): void
}

export interface CallRuntime {
  createPeerConnection(config: { iceServers: IceServerDto[] }): RTCPeerConnection
  getUserMedia(): Promise<MediaStream>
}

/** WebRTC et micro disponibles ? Il faut une connexion sécurisée (https ou localhost). */
export function defaultRuntime(): CallRuntime | null {
  if (typeof window === 'undefined' || typeof RTCPeerConnection === 'undefined' || !navigator.mediaDevices?.getUserMedia) return null
  if (window.isSecureContext === false) return null
  return {
    createPeerConnection: (config) => new RTCPeerConnection(config),
    getUserMedia: () => navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false }),
  }
}

/** Une description SDP doit utiliser des fins de ligne CRLF et se terminer par un saut de ligne, sinon certains navigateurs la refusent. */
export const normalizeSdp = (sdp: string) => {
  const body = sdp.replace(/\r\n|\r|\n/g, '\r\n')
  return body.endsWith('\r\n') ? body : `${body}\r\n`
}

const DEFAULT_ICE: IceServerDto[] = [{ urls: ['stun:stun.l.google.com:19302'] }]
const POLL_MS = 2000
const ICE_GATHER_TIMEOUT_MS = 4000
const DISCONNECT_GRACE_MS = 8000
const MAX_POLL_FAILURES = 5

function waitForIce(pc: RTCPeerConnection, timeoutMs: number): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve()
  return new Promise((resolve) => {
    const done = () => { clearTimeout(timer); pc.removeEventListener('icegatheringstatechange', check); resolve() }
    const check = () => { if (pc.iceGatheringState === 'complete') done() }
    const timer = setTimeout(done, timeoutMs) // un relais TURN lent ne doit pas bloquer l'appel : on envoie ce qu'on a
    pc.addEventListener('icegatheringstatechange', check)
  })
}

/** `connectionState` n'existe pas partout (anciens Safari) : on se rabat sur `iceConnectionState`. */
function effectiveState(pc: RTCPeerConnection): string {
  if (pc.connectionState) return pc.connectionState
  const ice = pc.iceConnectionState
  return ice === 'completed' ? 'connected' : ice
}

export class CallEngine {
  private s: CallState = IDLE_STATE
  /** Incrémenté à chaque début/fin d'appel : toute suite asynchrone d'un ancien appel s'ignore elle-même. */
  private session = 0
  private pc: RTCPeerConnection | null = null
  private local: MediaStream | null = null
  private pollTimer: ReturnType<typeof setTimeout> | undefined
  private disconnectTimer: ReturnType<typeof setTimeout> | undefined
  private pendingOffer: string | null = null
  private answerApplied = false
  private pollFailures = 0

  constructor(private deps: {
    api: CallApi
    runtime: CallRuntime | null
    onChange: (state: CallState) => void
    onRemoteStream: (stream: MediaStream | null) => void
  }) {}

  get state() { return this.s }
  isIdle() { return this.s.phase === 'idle' }
  /** Un appel est en cours (sonnerie, connexion ou conversation) : aucun autre ne peut démarrer. */
  isBusy() { return this.s.phase !== 'idle' && this.s.phase !== 'ended' }

  private set(patch: Partial<CallState>) {
    this.s = { ...this.s, ...patch }
    this.deps.onChange(this.s)
  }
  private stale(token: number) { return token !== this.session }

  private begin(direction: 'outgoing' | 'incoming', phase: CallPhase, peer: CallPeer) {
    this.cleanup()
    this.session += 1
    this.s = { phase, direction, peer, muted: false }
    this.deps.onChange(this.s)
    return this.session
  }

  private cleanup() {
    clearTimeout(this.pollTimer)
    clearTimeout(this.disconnectTimer)
    this.pollTimer = this.disconnectTimer = undefined
    this.local?.getTracks().forEach((track) => track.stop())
    this.local = null
    if (this.pc) {
      this.pc.onconnectionstatechange = null
      this.pc.oniceconnectionstatechange = null
      this.pc.ontrack = null
      this.pc.close()
    }
    this.pc = null
    this.pendingOffer = null
    this.answerApplied = false
    this.pollFailures = 0
    this.deps.onRemoteStream(null)
  }

  private finish(reason: CallEndReason, message?: string) {
    this.session += 1 // invalide toute opération asynchrone encore en vol
    this.cleanup()
    this.s = { phase: 'ended', direction: this.s.direction, peer: this.s.peer, callId: this.s.callId, muted: false, endReason: reason, message }
    this.deps.onChange(this.s)
  }

  /** Revient à l'état de repos une fois la fin d'appel affichée. */
  reset() {
    if (this.s.phase !== 'ended') return
    this.s = IDLE_STATE
    this.deps.onChange(this.s)
  }

  /** Libère micro et connexion sans rien émettre (démontage de l'application). */
  dispose() {
    this.session += 1
    this.cleanup()
  }

  // ── appel sortant ──────────────────────────────────────────────────────────

  async start(peer: CallPeer) {
    if (this.isBusy()) return
    const token = this.begin('outgoing', 'starting', peer)
    const runtime = this.deps.runtime
    if (!runtime) return this.finish('unsupported')

    // Le micro d'abord : si l'accès est refusé, on ne dérange pas le correspondant pour rien.
    try {
      this.local = await runtime.getUserMedia()
    } catch {
      if (!this.stale(token)) this.finish('no-microphone')
      return
    }
    if (this.stale(token)) { this.local.getTracks().forEach((track) => track.stop()); return }

    try {
      const ice = await this.deps.api.iceServers().catch(() => DEFAULT_ICE)
      if (this.stale(token)) return
      const pc = this.createPeer(runtime, ice, token)
      const offer = await pc.createOffer({ offerToReceiveAudio: true })
      await pc.setLocalDescription(offer)
      await waitForIce(pc, ICE_GATHER_TIMEOUT_MS)
      if (this.stale(token)) return
      const call = await this.deps.api.start({ toId: peer.id, offer: pc.localDescription?.sdp ?? offer.sdp ?? '' })
      if (this.stale(token)) { void this.deps.api.end(call.id).catch(() => undefined); return } // l'utilisateur a raccroché entre-temps
      this.set({ phase: 'calling', callId: call.id })
      this.schedulePoll(token)
    } catch (cause) {
      if (this.stale(token)) return
      const busy = cause instanceof ApiError && cause.status === 409
      this.finish(busy ? 'busy' : 'error', cause instanceof Error ? cause.message : undefined)
    }
  }

  // ── appel entrant ──────────────────────────────────────────────────────────

  /** Un appel entrant a été détecté (interrogation régulière) : on sonne et on surveille l'appelant. */
  incoming(call: CallInfo) {
    if (this.isBusy() || call.direction !== 'incoming' || call.status !== 'ringing') return
    const token = this.begin('incoming', 'ringing', { id: call.peer.id, displayName: call.peer.displayName, role: call.peer.role })
    this.s = { ...this.s, callId: call.id }
    this.deps.onChange(this.s)
    this.pendingOffer = call.offer
    this.schedulePoll(token)
  }

  /** Appel retrouvé sans interface (page rechargée en pleine conversation) : l'audio ne peut pas reprendre, on le termine proprement. */
  abandon(call: CallInfo) {
    void this.deps.api.end(call.id).catch(() => undefined)
  }

  async accept() {
    if (this.s.phase !== 'ringing' || this.s.direction !== 'incoming' || this.s.callId === undefined) return
    const token = this.session
    const callId = this.s.callId
    const offer = this.pendingOffer
    const runtime = this.deps.runtime
    this.set({ phase: 'connecting' })
    if (!runtime || !offer) { void this.deps.api.decline(callId).catch(() => undefined); return this.finish(runtime ? 'error' : 'unsupported') }

    try {
      this.local = await runtime.getUserMedia()
    } catch {
      if (this.stale(token)) return
      void this.deps.api.decline(callId).catch(() => undefined)
      return this.finish('no-microphone')
    }
    if (this.stale(token)) { this.local.getTracks().forEach((track) => track.stop()); return }

    try {
      const ice = await this.deps.api.iceServers().catch(() => DEFAULT_ICE)
      if (this.stale(token)) return
      const pc = this.createPeer(runtime, ice, token)
      await pc.setRemoteDescription({ type: 'offer', sdp: normalizeSdp(offer) })
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      await waitForIce(pc, ICE_GATHER_TIMEOUT_MS)
      if (this.stale(token)) return
      await this.deps.api.accept(callId, pc.localDescription?.sdp ?? answer.sdp ?? '')
      // La phase passe à « active » quand l'audio s'établit réellement (onconnectionstatechange).
    } catch (cause) {
      if (this.stale(token)) return
      this.finish(cause instanceof ApiError && cause.status === 422 ? 'missed' : 'error', cause instanceof Error ? cause.message : undefined)
    }
  }

  decline() {
    const { callId, phase, direction } = this.s
    if (phase !== 'ringing' || direction !== 'incoming') return
    if (callId !== undefined) void this.deps.api.decline(callId).catch(() => undefined)
    this.finish('declined')
  }

  // ── commun ─────────────────────────────────────────────────────────────────

  /** Raccrocher : annule la sonnerie, refuse l'appel entrant ou termine la conversation. */
  hangup() {
    const { phase, direction, callId } = this.s
    if (phase === 'idle' || phase === 'ended') return
    if (phase === 'ringing' && direction === 'incoming') return this.decline()
    if (callId !== undefined) void this.deps.api.end(callId).catch(() => undefined)
    this.finish('hangup') // pendant « starting » : l'appel n'existe pas encore, start() le terminera dès sa création
  }

  /** Fermeture de l'onglet : prévient le serveur même si la page se décharge. */
  onUnload() {
    if (this.isBusy() && this.s.callId !== undefined) this.deps.api.endOnUnload(this.s.callId)
  }

  toggleMute() {
    if (!this.local) return
    const muted = !this.s.muted
    this.local.getAudioTracks().forEach((track) => { track.enabled = !muted })
    this.set({ muted })
  }

  private createPeer(runtime: CallRuntime, iceServers: IceServerDto[], token: number) {
    const pc = runtime.createPeerConnection({ iceServers })
    this.pc = pc
    this.local?.getTracks().forEach((track) => pc.addTrack(track, this.local as MediaStream))
    pc.ontrack = (event) => { if (!this.stale(token)) this.deps.onRemoteStream(event.streams[0] ?? new MediaStream([event.track])) }
    const onState = () => { if (!this.stale(token)) this.onConnection(token, effectiveState(pc)) }
    pc.onconnectionstatechange = onState
    pc.oniceconnectionstatechange = onState
    return pc
  }

  private onConnection(token: number, state: string) {
    if (state === 'connected') {
      clearTimeout(this.disconnectTimer)
      if (this.s.phase === 'connecting' || this.s.phase === 'calling') this.set({ phase: 'active', connectedAt: Date.now() })
    } else if (state === 'disconnected') {
      // Coupure brève (changement de réseau, tunnel…) : on laisse une chance à la connexion de revenir.
      clearTimeout(this.disconnectTimer)
      this.disconnectTimer = setTimeout(() => { if (!this.stale(token)) this.endBecause('connection_lost') }, DISCONNECT_GRACE_MS)
    } else if (state === 'failed') {
      this.endBecause('failed')
    }
  }

  private endBecause(reason: CallEndReason) {
    if (this.s.callId !== undefined) void this.deps.api.end(this.s.callId).catch(() => undefined)
    this.finish(reason)
  }

  // ── surveillance de l'état côté serveur ────────────────────────────────────

  private schedulePoll(token: number) {
    this.pollTimer = setTimeout(() => void this.poll(token), POLL_MS)
  }

  private async poll(token: number) {
    if (this.stale(token) || this.s.callId === undefined) return
    try {
      const call = await this.deps.api.show(this.s.callId)
      if (this.stale(token)) return
      this.pollFailures = 0
      await this.applyRemote(call, token)
    } catch (cause) {
      if (this.stale(token)) return
      this.pollFailures += 1
      const fatal = cause instanceof ApiError && [401, 403, 404].includes(cause.status)
      if (fatal || this.pollFailures >= MAX_POLL_FAILURES) return this.finish('connection_lost')
    }
    if (!this.stale(token) && this.isBusy()) this.schedulePoll(token)
  }

  private async applyRemote(call: CallInfo, token: number) {
    switch (call.status) {
      case 'accepted':
        if (call.direction === 'outgoing' && call.answer && !this.answerApplied && this.pc) {
          this.answerApplied = true
          await this.pc.setRemoteDescription({ type: 'answer', sdp: normalizeSdp(call.answer) })
          if (!this.stale(token) && this.s.phase === 'calling') this.set({ phase: 'connecting' })
        }
        break
      case 'declined': this.finish('declined'); break
      case 'missed': this.finish('missed'); break
      case 'cancelled': this.finish('cancelled'); break
      case 'ended': this.finish(call.endReason === 'connection_lost' ? 'connection_lost' : 'hangup'); break
      default: break
    }
  }
}
