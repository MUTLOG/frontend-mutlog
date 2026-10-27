// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Service d'appel vu par l'utilisateur : écran d'appel entrant/sortant, boutons « Appeler », cas d'erreur.
const h = vi.hoisted(() => {
  const shipment = {
    id: 31, ref: 'MUT-2026-000031', status: 'en_cours', poolingId: 5, events: [], createdAt: '2026-10-16T08:00:00Z', breakdown: null,
    offer: { id: 3, from: 'Lokossa', to: 'Cotonou', date: '2026-11-02', totalCapacityT: 4, availableT: 2, goodsAccepted: ['agricoles'], pricingMode: 'forfait', price: 200000, status: 'ouverte',
      transporter: { id: 21, displayName: 'Jean Transport', firstName: 'Jean' } },
    share: { requestId: 12, weightT: 1, amount: 50000, payable: 55000 }, payment: null, carrierPhone: '0197000021',
  }
  const ringing = {
    id: 7, status: 'ringing', direction: 'incoming', peer: { id: 21, displayName: 'Jean Transport', role: 'transporteur' }, offer: 'v=0\r\nfake-offer\r\n', answer: null,
    createdAt: '2099-01-01T00:00:00Z', answeredAt: null, endedAt: null, endReason: null, durationSeconds: 0,
  }
  return {
    shipment, ringing,
    user: { id: 1, role: 'client', userType: 'autre_client', firstName: 'Sophie', lastName: 'Adjovi', phone: '0197000011', email: null, address: 'Cotonou', city: 'Cotonou', status: 'actif' },
    api: {
      current: vi.fn(async () => null as unknown),
      iceServers: vi.fn(async () => [{ urls: ['stun:stun.test'] }]),
      start: vi.fn(async (_i: unknown) => ({ ...ringing, direction: 'outgoing', offer: null }) as unknown),
      show: vi.fn(async (_id: unknown) => ({ ...ringing, direction: 'outgoing', offer: null }) as unknown),
      accept: vi.fn(async (_id: unknown, _a: unknown) => ({ ...ringing, status: 'accepted', offer: null }) as unknown),
      decline: vi.fn(async (_id: unknown) => ({}) as unknown),
      end: vi.fn(async (_id: unknown) => ({}) as unknown),
      endOnUnload: vi.fn(),
    },
  }
})

vi.mock('@/services/mutlogApi', async (orig) => {
  const real = await orig<typeof import('@/services/mutlogApi')>()
  return {
    ...real,
    callApi: h.api,
    clientApi: { ...real.clientApi, shipment: async () => h.shipment },
    sharedApi: {
      ...real.sharedApi, notifications: async () => [], reviews: async () => [],
      peers: async () => [{ id: 21, displayName: 'Jean Transport', role: 'transporteur' }], thread: async () => [],
    },
  }
})

import App from '@/App'
import { ApiError, setApiUser, setToken, type ApiUser } from '@/services/api'
import { useIdleLogout } from '@/hooks/useIdleLogout'

/** Faux RTCPeerConnection minimal (voir aussi callEngine.test.ts). */
class FakePC {
  static all: FakePC[] = []
  iceGatheringState = 'complete'
  connectionState = 'new'
  iceConnectionState = 'new'
  localDescription: { sdp: string } | null = null
  onconnectionstatechange: (() => void) | null = null
  oniceconnectionstatechange: (() => void) | null = null
  ontrack: unknown = null
  constructor() { FakePC.all.push(this) }
  addTrack() {}
  async createOffer() { return { type: 'offer', sdp: 'v=0\r\nfake-offer\r\n' } }
  async createAnswer() { return { type: 'answer', sdp: 'v=0\r\nfake-answer\r\n' } }
  async setLocalDescription(d: { sdp: string }) { this.localDescription = d }
  async setRemoteDescription() {}
  addEventListener() {}
  removeEventListener() {}
  close() {}
  connected() { this.connectionState = 'connected'; this.onconnectionstatechange?.() }
}

let getUserMedia: ReturnType<typeof vi.fn>
const micTrack = { enabled: true, stop: vi.fn() }

beforeAll(() => {
  ;(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
  window.scrollTo = () => {}
  Element.prototype.scrollIntoView = () => {}
})
beforeEach(() => {
  cleanup()
  vi.clearAllMocks()
  FakePC.all = []
  getUserMedia = vi.fn(async () => ({ getTracks: () => [micTrack], getAudioTracks: () => [micTrack] }))
  ;(globalThis as unknown as { RTCPeerConnection: unknown }).RTCPeerConnection = FakePC
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })
  h.api.current.mockResolvedValue(null)
  h.api.start.mockResolvedValue({ ...h.ringing, direction: 'outgoing', offer: null })
  h.api.show.mockResolvedValue({ ...h.ringing, direction: 'outgoing', offer: null })
  setToken('token'); setApiUser(h.user as ApiUser)
})
afterEach(() => { cleanup(); setApiUser(null); setToken(null); delete (globalThis as { RTCPeerConnection?: unknown }).RTCPeerConnection })

const open = (path: string) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
const dialog = (name: RegExp | string) => screen.findByRole('dialog', { name })
const gone = () => waitFor(() => expect(screen.queryByRole('dialog', { name: /Appel/ })).toBeNull())

describe('appel entrant', () => {
  it('l\'écran sonne, on répond, la conversation démarre avec son chronomètre, puis on raccroche', async () => {
    h.api.current.mockResolvedValueOnce(h.ringing)
    open('/client/dashboard')

    expect(await dialog('Appel entrant de Jean Transport')).toBeTruthy()
    expect(screen.getByText('Transporteur')).toBeTruthy()
    expect(getUserMedia).not.toHaveBeenCalled() // le micro ne s'ouvre qu'à la réponse

    fireEvent.click(screen.getByRole('button', { name: 'Répondre' }))
    await waitFor(() => expect(h.api.accept).toHaveBeenCalledWith(7, 'v=0\r\nfake-answer\r\n'))
    expect(getUserMedia).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Connexion…')).toBeTruthy()

    FakePC.all[0].connected()
    expect(await screen.findByText('00:00')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Couper le micro' }))
    expect(micTrack.enabled).toBe(false)
    expect(screen.getByRole('button', { name: 'Réactiver le micro' }).getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: 'Raccrocher' }))
    expect(h.api.end).toHaveBeenCalledWith(7)
    await gone()
    expect(micTrack.stop).toHaveBeenCalled() // le micro est libéré
  })

  it('refuser : le serveur est prévenu, le micro n\'a jamais été ouvert, retour immédiat à l\'application', async () => {
    h.api.current.mockResolvedValueOnce(h.ringing)
    open('/client/dashboard')
    await dialog('Appel entrant de Jean Transport')
    fireEvent.click(screen.getByRole('button', { name: 'Refuser' }))
    expect(h.api.decline).toHaveBeenCalledWith(7)
    await gone()
    expect(getUserMedia).not.toHaveBeenCalled()
  })

  it('l\'appelant raccroche avant la réponse : la fin d\'appel est annoncée puis se ferme', async () => {
    h.api.current.mockResolvedValueOnce(h.ringing)
    h.api.show.mockResolvedValue({ ...h.ringing, status: 'cancelled' })
    open('/client/dashboard')
    await dialog('Appel entrant de Jean Transport')
    expect(await screen.findByText('Appel annulé', undefined, { timeout: 6000 })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }))
    await gone()
  })

  it('un appel resté ouvert après rechargement de la page est terminé côté serveur, sans écran', async () => {
    h.api.current.mockResolvedValueOnce({ ...h.ringing, status: 'accepted', offer: null })
    open('/client/dashboard')
    await waitFor(() => expect(h.api.end).toHaveBeenCalledWith(7))
    expect(screen.queryByRole('dialog', { name: /Appel/ })).toBeNull()
  })
})

describe('appel sortant', () => {
  it('depuis les messages : appeler, sonnerie, réponse, conversation, raccrocher', async () => {
    open('/client/messages?avec=21')
    fireEvent.click(await screen.findByRole('button', { name: 'Appeler Jean Transport' }))

    expect(await dialog('Appel avec Jean Transport')).toBeTruthy()
    await waitFor(() => expect(h.api.start).toHaveBeenCalledTimes(1))
    expect(h.api.start.mock.calls[0][0]).toEqual({ toId: '21', offer: 'v=0\r\nfake-offer\r\n' })
    expect(await screen.findByText('Sonnerie…')).toBeTruthy()

    h.api.show.mockResolvedValue({ ...h.ringing, direction: 'outgoing', offer: null, status: 'accepted', answer: 'v=0\r\nfake-answer\r\n' })
    expect(await screen.findByText('Connexion…', undefined, { timeout: 6000 })).toBeTruthy()
    FakePC.all[0].connected()
    expect(await screen.findByText('00:00')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Raccrocher' }))
    expect(h.api.end).toHaveBeenCalledWith(7)
    await gone()
  })

  it('le correspondant refuse : « Appel refusé »', async () => {
    open('/client/messages?avec=21')
    fireEvent.click(await screen.findByRole('button', { name: 'Appeler Jean Transport' }))
    await dialog('Appel avec Jean Transport')
    h.api.show.mockResolvedValue({ ...h.ringing, direction: 'outgoing', offer: null, status: 'declined' })
    expect(await screen.findByText('Appel refusé', undefined, { timeout: 6000 })).toBeTruthy()
  })

  it('depuis la fiche d\'une expédition : le bouton cible le transporteur de l\'opération', async () => {
    open('/client/expeditions/31')
    fireEvent.click(await screen.findByRole('button', { name: 'Appeler Jean Transport' }))
    await waitFor(() => expect(h.api.start).toHaveBeenCalledTimes(1))
    expect(h.api.start.mock.calls[0][0]).toMatchObject({ toId: 21 })
  })

  it('correspondant déjà en ligne : le message du serveur est affiché', async () => {
    h.api.start.mockRejectedValue(new ApiError('Votre correspondant est déjà en communication.', 409))
    open('/client/messages?avec=21')
    fireEvent.click(await screen.findByRole('button', { name: 'Appeler Jean Transport' }))
    expect(await screen.findByText('Votre correspondant est déjà en communication.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }))
    await gone()
  })

  it('micro refusé : explication claire, aucun appel créé', async () => {
    getUserMedia.mockRejectedValue(new DOMException('refusé', 'NotAllowedError'))
    open('/client/messages?avec=21')
    fireEvent.click(await screen.findByRole('button', { name: 'Appeler Jean Transport' }))
    expect(await screen.findByText(/Microphone inaccessible/)).toBeTruthy()
    expect(h.api.start).not.toHaveBeenCalled()
  })

  it('un appel en cours bloque les autres boutons « Appeler »', async () => {
    open('/client/messages?avec=21')
    fireEvent.click(await screen.findByRole('button', { name: 'Appeler Jean Transport' }))
    await dialog('Appel avec Jean Transport')
    const behind = document.querySelector('button[aria-label="Appeler Jean Transport"]') as HTMLButtonElement
    expect(behind.disabled).toBe(true)
  })
})

describe('navigateur sans appels', () => {
  it('le bouton est désactivé avec une explication et le serveur n\'est pas interrogé', async () => {
    delete (globalThis as { RTCPeerConnection?: unknown }).RTCPeerConnection
    open('/client/messages?avec=21')
    const button = (await screen.findByRole('button', { name: 'Appeler Jean Transport' })) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    expect(button.title).toMatch(/connexion sécurisée et micro requis/)
    expect(h.api.current).not.toHaveBeenCalled()
  })
})

describe('déconnexion automatique', () => {
  afterEach(() => { vi.useRealTimers() })

  it('se déclenche après la durée d\'inactivité, sans être relancée par les rendus ni par une fonction qui change', () => {
    vi.useFakeTimers()
    const onIdle = vi.fn()
    const { rerender } = renderHook(({ fn }) => useIdleLogout(30, fn), { initialProps: { fn: () => onIdle('a') } })
    vi.advanceTimersByTime(20 * 60_000)
    rerender({ fn: () => onIdle('b') }) // nouveau rendu avec une nouvelle fonction : le minuteur n'est pas remis à zéro
    vi.advanceTimersByTime(10 * 60_000 + 1)
    expect(onIdle).toHaveBeenCalledTimes(1)
    expect(onIdle).toHaveBeenCalledWith('b') // c'est la fonction la plus récente qui est appelée
  })

  it('une activité (ou un appel en cours qui en simule une) repousse la déconnexion', () => {
    vi.useFakeTimers()
    const onIdle = vi.fn()
    renderHook(() => useIdleLogout(30, onIdle))
    vi.advanceTimersByTime(29 * 60_000)
    window.dispatchEvent(new Event('mousemove'))
    vi.advanceTimersByTime(29 * 60_000)
    expect(onIdle).not.toHaveBeenCalled()
    vi.advanceTimersByTime(2 * 60_000)
    expect(onIdle).toHaveBeenCalledTimes(1)
  })
})
