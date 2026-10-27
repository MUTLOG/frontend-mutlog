// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/services/api'
import type { CallInfo } from '@/services/mutlogApi'
import { CallEngine, defaultRuntime, normalizeSdp, type CallApi, type CallState } from './callEngine'

/** Faux RTCPeerConnection : juste ce que le moteur utilise, avec des commandes pour simuler le réseau. */
class FakePC {
  static all: FakePC[] = []
  iceGatheringState = 'new'
  connectionState = 'new'
  iceConnectionState = 'new'
  localDescription: { type: string; sdp: string } | null = null
  remoteDescription: { type: string; sdp: string } | null = null
  closed = false
  tracks: unknown[] = []
  onconnectionstatechange: (() => void) | null = null
  oniceconnectionstatechange: (() => void) | null = null
  ontrack: ((e: unknown) => void) | null = null
  private listeners = new Set<() => void>()
  static slowIce = false
  constructor(public config: unknown) { FakePC.all.push(this) }
  addTrack(track: unknown) { this.tracks.push(track) }
  async createOffer() { return { type: 'offer', sdp: 'v=0\r\nfake-offer\r\n' } }
  async createAnswer() { return { type: 'answer', sdp: 'v=0\r\nfake-answer\r\n' } }
  async setLocalDescription(d: { type: string; sdp: string }) { this.localDescription = d; if (!FakePC.slowIce) this.iceGatheringState = 'complete' }
  async setRemoteDescription(d: { type: string; sdp: string }) { this.remoteDescription = d }
  addEventListener(_: string, fn: () => void) { this.listeners.add(fn) }
  removeEventListener(_: string, fn: () => void) { this.listeners.delete(fn) }
  close() { this.closed = true }
  // commandes de test
  net(state: string) { this.connectionState = state; this.onconnectionstatechange?.() }
}

const track = () => ({ enabled: true, stop: vi.fn() })
const makeStream = () => { const t = track(); return { t, stream: { getTracks: () => [t], getAudioTracks: () => [t] } as unknown as MediaStream } }

const info = (over: Partial<CallInfo> = {}): CallInfo => ({
  id: 7, status: 'ringing', direction: 'outgoing', peer: { id: 21, displayName: 'Jean Transport', role: 'transporteur' }, offer: null, answer: null,
  createdAt: '2099-01-01T00:00:00Z', answeredAt: null, endedAt: null, endReason: null, durationSeconds: 0, ...over,
})

let api: { [K in keyof CallApi]: ReturnType<typeof vi.fn> }
let states: CallState[]
let remote: Array<MediaStream | null>
let mic: ReturnType<typeof makeStream>
let getUserMedia: ReturnType<typeof vi.fn>

const engine = (runtime = true) => new CallEngine({
  api: api as unknown as CallApi,
  runtime: runtime ? { createPeerConnection: (c) => new FakePC(c) as unknown as RTCPeerConnection, getUserMedia } : null,
  onChange: (s) => states.push(s),
  onRemoteStream: (s) => remote.push(s),
})
const last = () => states[states.length - 1]
const flush = () => vi.advanceTimersByTimeAsync(0)
const tick = (ms = 2000) => vi.advanceTimersByTimeAsync(ms)

beforeEach(() => {
  vi.useFakeTimers()
  FakePC.all = []; FakePC.slowIce = false; states = []; remote = []
  mic = makeStream()
  getUserMedia = vi.fn(async () => mic.stream)
  api = {
    iceServers: vi.fn(async () => [{ urls: ['stun:stun.test'] }]),
    start: vi.fn(async () => info()),
    show: vi.fn(async () => info()),
    accept: vi.fn(async () => info({ status: 'accepted', direction: 'incoming' })),
    decline: vi.fn(async () => info({ status: 'declined' })),
    end: vi.fn(async () => info({ status: 'ended' })),
    endOnUnload: vi.fn(),
  }
})
afterEach(() => { vi.useRealTimers() })

describe('normalizeSdp', () => {
  it('uniformise les fins de ligne en CRLF et garantit le saut de ligne final', () => {
    expect(normalizeSdp('v=0\ns=-')).toBe('v=0\r\ns=-\r\n')
    expect(normalizeSdp('v=0\r\ns=-\r\n')).toBe('v=0\r\ns=-\r\n')
    expect(normalizeSdp('v=0\ns=-\n')).toBe('v=0\r\ns=-\r\n')
  })
})

describe('appel sortant', () => {
  it('micro → offre complète envoyée → sonnerie → réponse appliquée → audio établi → raccrocher', async () => {
    const e = engine()
    const started = e.start({ id: 21, displayName: 'Jean Transport' })
    expect(last().phase).toBe('starting')
    await started

    expect(getUserMedia).toHaveBeenCalledTimes(1)
    expect(api.iceServers).toHaveBeenCalled()
    expect(api.start).toHaveBeenCalledWith({ toId: 21, offer: 'v=0\r\nfake-offer\r\n' })
    expect(last()).toMatchObject({ phase: 'calling', direction: 'outgoing', callId: 7, peer: { displayName: 'Jean Transport' } })
    expect(FakePC.all[0].tracks).toHaveLength(1) // le micro est bien envoyé

    await tick() // sonnerie : pas encore de réponse
    expect(api.show).toHaveBeenCalledWith(7)
    expect(last().phase).toBe('calling')

    api.show.mockResolvedValue(info({ status: 'accepted', answer: 'v=0\nfake-answer' })) // sans CRLF final : le moteur le corrige
    await tick()
    expect(FakePC.all[0].remoteDescription).toEqual({ type: 'answer', sdp: 'v=0\r\nfake-answer\r\n' })
    expect(last().phase).toBe('connecting')

    FakePC.all[0].net('connected')
    expect(last().phase).toBe('active')
    expect(last().connectedAt).toBeTypeOf('number')

    e.hangup()
    expect(api.end).toHaveBeenCalledWith(7)
    expect(last()).toMatchObject({ phase: 'ended', endReason: 'hangup' })
    expect(mic.t.stop).toHaveBeenCalled()
    expect(FakePC.all[0].closed).toBe(true)
    expect(remote[remote.length - 1]).toBeNull()
    await tick(10000)
    expect(api.show).toHaveBeenCalledTimes(2) // plus aucune interrogation après la fin
  })

  it('ne dérange pas le correspondant si le micro est refusé', async () => {
    getUserMedia.mockRejectedValue(new DOMException('refusé', 'NotAllowedError'))
    const e = engine()
    await e.start({ id: 21, displayName: 'Jean' })
    expect(last()).toMatchObject({ phase: 'ended', endReason: 'no-microphone' })
    expect(api.start).not.toHaveBeenCalled()
  })

  it('appareil sans WebRTC : fin immédiate « non pris en charge »', async () => {
    const e = engine(false)
    await e.start({ id: 21, displayName: 'Jean' })
    expect(last()).toMatchObject({ phase: 'ended', endReason: 'unsupported' })
    expect(getUserMedia).not.toHaveBeenCalled()
  })

  it('correspondant déjà en ligne (409) : message du serveur et micro libéré', async () => {
    api.start.mockRejectedValue(new ApiError('Votre correspondant est déjà en communication.', 409))
    const e = engine()
    await e.start({ id: 21, displayName: 'Jean' })
    expect(last()).toMatchObject({ phase: 'ended', endReason: 'busy', message: 'Votre correspondant est déjà en communication.' })
    expect(mic.t.stop).toHaveBeenCalled()
    expect(FakePC.all[0].closed).toBe(true)
  })

  it('autre erreur du serveur : fin « erreur » avec son message', async () => {
    api.start.mockRejectedValue(new ApiError('Ce correspondant n\'est pas joignable pour le moment.', 422))
    const e = engine()
    await e.start({ id: 21, displayName: 'Jean' })
    expect(last()).toMatchObject({ endReason: 'error', message: 'Ce correspondant n\'est pas joignable pour le moment.' })
  })

  it.each([['declined', 'declined'], ['missed', 'missed'], ['cancelled', 'cancelled']] as const)('le destinataire ou le délai met fin à la sonnerie : %s', async (status, reason) => {
    const e = engine()
    await e.start({ id: 21, displayName: 'Jean' })
    api.show.mockResolvedValue(info({ status }))
    await tick()
    expect(last()).toMatchObject({ phase: 'ended', endReason: reason })
    expect(api.end).not.toHaveBeenCalled() // le serveur sait déjà que l'appel est terminé
  })

  it('raccrocher pendant l\'établissement : l\'appel créé juste après est immédiatement terminé côté serveur', async () => {
    let release: (c: CallInfo) => void = () => undefined
    api.start.mockImplementation(() => new Promise<CallInfo>((resolve) => { release = resolve }))
    const e = engine()
    const started = e.start({ id: 21, displayName: 'Jean' })
    await flush()
    e.hangup() // aucun appel n'existe encore côté serveur
    expect(last()).toMatchObject({ phase: 'ended', endReason: 'hangup' })
    expect(api.end).not.toHaveBeenCalled()
    release(info({ id: 55 }))
    await started
    await flush()
    expect(api.end).toHaveBeenCalledWith(55)
    expect(last().phase).toBe('ended') // pas de résurrection de l'état « calling »
  })

  it('envoie l\'offre même si la collecte ICE traîne (délai de 4 s)', async () => {
    FakePC.slowIce = true
    const e = engine()
    const started = e.start({ id: 21, displayName: 'Jean' })
    await flush()
    expect(api.start).not.toHaveBeenCalled()
    await tick(4000)
    await started
    expect(api.start).toHaveBeenCalledTimes(1)
  })

  it('serveurs ICE indisponibles : repli sur le STUN public', async () => {
    api.iceServers.mockRejectedValue(new Error('hors ligne'))
    const e = engine()
    await e.start({ id: 21, displayName: 'Jean' })
    expect((FakePC.all[0].config as { iceServers: Array<{ urls: string[] }> }).iceServers[0].urls[0]).toMatch(/^stun:/)
    expect(last().phase).toBe('calling')
  })

  it('ne démarre pas un second appel pendant un appel', async () => {
    const e = engine()
    await e.start({ id: 21, displayName: 'Jean' })
    await e.start({ id: 22, displayName: 'Marius' })
    expect(api.start).toHaveBeenCalledTimes(1)
  })
})

describe('appel entrant', () => {
  const ringing = () => info({ direction: 'incoming', offer: 'v=0\nfake-offer', peer: { id: 11, displayName: 'Sophie A.', role: 'client' } })

  it('sonnerie → réponse : micro, offre appliquée, réponse complète envoyée, audio établi', async () => {
    const e = engine()
    e.incoming(ringing())
    expect(last()).toMatchObject({ phase: 'ringing', direction: 'incoming', callId: 7, peer: { displayName: 'Sophie A.' } })
    expect(getUserMedia).not.toHaveBeenCalled() // pas de micro tant qu'on n'a pas répondu

    await e.accept()
    expect(getUserMedia).toHaveBeenCalledTimes(1)
    expect(FakePC.all[0].remoteDescription).toEqual({ type: 'offer', sdp: 'v=0\r\nfake-offer\r\n' })
    expect(api.accept).toHaveBeenCalledWith(7, 'v=0\r\nfake-answer\r\n')
    expect(last().phase).toBe('connecting')

    FakePC.all[0].net('connected')
    expect(last().phase).toBe('active')
  })

  it('refuser : le serveur est prévenu et le micro n\'a jamais été ouvert', async () => {
    const e = engine()
    e.incoming(ringing())
    e.decline()
    expect(api.decline).toHaveBeenCalledWith(7)
    expect(last()).toMatchObject({ phase: 'ended', endReason: 'declined' })
    expect(getUserMedia).not.toHaveBeenCalled()
  })

  it('raccrocher pendant la sonnerie équivaut à refuser', async () => {
    const e = engine()
    e.incoming(ringing())
    e.hangup()
    expect(api.decline).toHaveBeenCalledWith(7)
    expect(api.end).not.toHaveBeenCalled()
  })

  it('micro refusé à la réponse : l\'appel est refusé proprement', async () => {
    getUserMedia.mockRejectedValue(new DOMException('refusé', 'NotAllowedError'))
    const e = engine()
    e.incoming(ringing())
    await e.accept()
    expect(api.decline).toHaveBeenCalledWith(7)
    expect(last()).toMatchObject({ phase: 'ended', endReason: 'no-microphone' })
  })

  it('l\'appelant raccroche avant la réponse : la sonnerie s\'arrête', async () => {
    const e = engine()
    e.incoming(ringing())
    api.show.mockResolvedValue(info({ direction: 'incoming', status: 'cancelled' }))
    await tick()
    expect(last()).toMatchObject({ phase: 'ended', endReason: 'cancelled' })
  })

  it('l\'appel a expiré quand on décroche (422) : fin « manqué »', async () => {
    api.accept.mockRejectedValue(new ApiError('Cet appel n\'est plus disponible.', 422))
    const e = engine()
    e.incoming(ringing())
    await e.accept()
    expect(last()).toMatchObject({ phase: 'ended', endReason: 'missed' })
    expect(mic.t.stop).toHaveBeenCalled()
  })

  it('ignore un appel entrant déjà en cours de traitement ou qui ne sonne plus', async () => {
    const e = engine()
    e.incoming(info({ direction: 'incoming', status: 'accepted', offer: null }))
    expect(e.isIdle()).toBe(true)
    e.incoming(ringing())
    e.incoming({ ...ringing(), id: 99 })
    expect(last().callId).toBe(7)
  })

  it('un appel retrouvé après rechargement de la page est terminé côté serveur', () => {
    const e = engine()
    e.abandon(info({ id: 42, status: 'accepted' }))
    expect(api.end).toHaveBeenCalledWith(42)
    expect(e.isIdle()).toBe(true)
  })
})

describe('pendant la conversation', () => {
  async function activeCall() {
    const e = engine()
    await e.start({ id: 21, displayName: 'Jean' })
    api.show.mockResolvedValue(info({ status: 'accepted', answer: 'v=0\nfake-answer' }))
    await tick()
    FakePC.all[0].net('connected')
    return e
  }

  it('couper puis réactiver le micro', async () => {
    const e = await activeCall()
    e.toggleMute()
    expect(mic.t.enabled).toBe(false)
    expect(last().muted).toBe(true)
    e.toggleMute()
    expect(mic.t.enabled).toBe(true)
    expect(last().muted).toBe(false)
  })

  it('le correspondant raccroche : fin d\'appel', async () => {
    const e = await activeCall()
    api.show.mockResolvedValue(info({ status: 'ended', endReason: 'hangup' }))
    await tick()
    expect(last()).toMatchObject({ phase: 'ended', endReason: 'hangup' })
    expect(e.isBusy()).toBe(false)
  })

  it('le serveur signale une connexion perdue (correspondant disparu)', async () => {
    await activeCall()
    api.show.mockResolvedValue(info({ status: 'ended', endReason: 'connection_lost' }))
    await tick()
    expect(last()).toMatchObject({ phase: 'ended', endReason: 'connection_lost' })
  })

  it('connexion audio en échec : l\'appel est terminé et le serveur prévenu', async () => {
    await activeCall()
    FakePC.all[0].net('failed')
    expect(last()).toMatchObject({ phase: 'ended', endReason: 'failed' })
    expect(api.end).toHaveBeenCalledWith(7)
  })

  it('coupure réseau brève : l\'appel survit si la connexion revient avant 8 s', async () => {
    await activeCall()
    FakePC.all[0].net('disconnected')
    await tick(5000)
    FakePC.all[0].net('connected')
    await tick(10000)
    expect(last().phase).toBe('active')
  })

  it('coupure réseau durable : fin « connexion perdue » après 8 s', async () => {
    await activeCall()
    FakePC.all[0].net('disconnected')
    await tick(8100)
    expect(last()).toMatchObject({ phase: 'ended', endReason: 'connection_lost' })
    expect(api.end).toHaveBeenCalledWith(7)
  })

  it('erreurs réseau passagères tolérées, puis fin après 5 échecs consécutifs', async () => {
    await activeCall()
    api.show.mockRejectedValue(new Error('réseau'))
    await tick(2000 * 4)
    expect(last().phase).toBe('active') // pas encore : l'audio reste établi de pair à pair, seule la surveillance serveur échoue
    await tick(2000 * 2)
    expect(last()).toMatchObject({ phase: 'ended', endReason: 'connection_lost' })
  })

  it('session expirée (401) ou appel introuvable (404) : fin immédiate', async () => {
    await activeCall()
    api.show.mockRejectedValue(new ApiError('Unauthenticated.', 401))
    await tick()
    expect(last()).toMatchObject({ phase: 'ended', endReason: 'connection_lost' })
  })

  it('fermeture de l\'onglet : le serveur est prévenu par une requête qui survit au déchargement', async () => {
    const e = await activeCall()
    e.onUnload()
    expect(api.endOnUnload).toHaveBeenCalledWith(7)
  })

  it('reset() remet l\'état au repos après l\'affichage de la fin d\'appel', async () => {
    const e = await activeCall()
    e.hangup()
    expect(e.isIdle()).toBe(false)
    e.reset()
    expect(e.isIdle()).toBe(true)
    await e.start({ id: 21, displayName: 'Jean' })
    expect(api.start).toHaveBeenCalledTimes(2) // un nouvel appel est possible
  })
})

describe('defaultRuntime', () => {
  it('indisponible sans WebRTC ni micro (navigateur ancien ou connexion non sécurisée)', () => {
    expect(defaultRuntime()).toBeNull()
  })
})
