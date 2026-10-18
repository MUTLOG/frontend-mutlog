// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Espace client : toutes les données viennent de l'API Laravel (simulée ici), jamais de la base locale.
const h = vi.hoisted(() => {
  const offer = {
    id: 3, from: 'Lokossa', to: 'Cotonou', date: '2026-11-02', totalCapacityT: 4, availableT: 2, goodsAccepted: ['agricoles'],
    pricingMode: 'forfait', price: 200000, status: 'ouverte', vehicle: { type: 'camion', capacityT: 4 },
    transporter: { id: 21, displayName: 'Jean Transport', firstName: 'Jean', city: 'Lokossa', role: 'transporteur', verified: true, rating: { avg: 4.5, count: 2 } },
  }
  const requests = [
    { id: 11, from: 'Lokossa', to: 'Cotonou', date: '2026-11-02', goods: 'agricoles', weightT: 1, attachments: [], contact: '0197000011', status: 'recherche', createdAt: '2026-10-15T08:00:00Z' },
    { id: 12, from: 'Cotonou', to: 'Natitingou', date: '2026-11-10', goods: 'materiaux', weightT: 2, attachments: [], contact: '0197000011', status: 'confirmee', createdAt: '2026-10-14T08:00:00Z' },
  ]
  const shipments = [
    {
      id: 31, ref: 'MUT-2026-000031', status: 'livree', poolingId: 5, offer, createdAt: '2026-10-16T08:00:00Z',
      events: [
        { id: 1, kind: 'statut', label: 'Confirmé', lat: null, lng: null, at: '2026-10-16T08:00:00Z' },
        { id: 2, kind: 'position', label: 'Position GPS', lat: 6.4, lng: 2.3, at: '2026-10-17T08:00:00Z' },
      ],
      share: { requestId: 12, weightT: 1, amount: 50000, payable: 55000 },
      payment: { id: 41, transportId: 31, requestId: 12, clientId: 1, amount: 55000, method: 'mobile_money', status: 'en_attente', reference: null, receiptNo: null, createdAt: '2026-10-16T08:00:00Z' },
      carrierPhone: '0197000021',
    },
    {
      id: 32, ref: 'MUT-2026-000032', status: 'terminee', poolingId: 6, offer: { ...offer, id: 4, pricingMode: 'tonne', price: 30000 }, createdAt: '2026-10-10T08:00:00Z',
      events: [{ id: 3, kind: 'statut', label: 'Terminé', lat: null, lng: null, at: '2026-10-12T08:00:00Z' }],
      share: { requestId: 13, weightT: 1, amount: 30000, payable: 30000 },
      payment: { id: 42, transportId: 32, requestId: 13, clientId: 1, amount: 30000, method: 'mobile_money', status: 'confirme', reference: 'TXN-1', receiptNo: 'REC-2026-0001', confirmedAt: '2026-10-11T08:00:00Z', createdAt: '2026-10-10T08:00:00Z' },
      carrierPhone: '0197000021',
    },
  ]
  return {
    offer, requests, shipments,
    client: { id: 1, role: 'client', userType: 'autre_client', firstName: 'Sophie', lastName: 'Adjovi', phone: '0197000011', email: null, address: 'Cotonou', city: 'Cotonou', status: 'actif' },
    api: {
      requests: vi.fn(async (_q?: string) => requests as unknown),
      request: vi.fn(async (_id: unknown) => ({
        ...requests[0], matches: [{ offer, score: 92, criteria: [{ key: 'origine', label: 'Origine', ok: true, ratio: 1 }] }],
        reservations: [], share: null, transportId: null,
      }) as unknown),
      createRequest: vi.fn(async (_input: unknown) => requests[0] as unknown),
      cancelRequest: vi.fn(async (_id: unknown) => requests[0] as unknown),
      reservations: vi.fn(async () => [{ id: 51, requestId: 11, offerId: 3, clientId: 1, transporterId: 21, weightT: 1, status: 'en_attente', offer, createdAt: '2026-10-15T09:00:00Z' }] as unknown),
      reserve: vi.fn(async (_r: unknown, _o: unknown) => ({}) as unknown),
      shipments: vi.fn(async () => shipments as unknown),
      shipment: vi.fn(async (_id: unknown) => shipments[0] as unknown),
      declarePayment: vi.fn(async (_id: unknown, _m: unknown, _r: unknown) => ({}) as unknown),
      confirmReceipt: vi.fn(async (_id: unknown) => ({}) as unknown),
    },
    reviews: vi.fn(async (_q?: string) => [] as unknown[]),
    reviewTransport: vi.fn(async (_id: unknown, _input: unknown) => ({}) as unknown),
  }
})

vi.mock('@/services/api', async (orig) => ({
  ...(await orig<typeof import('@/services/api')>()),
  apiEnabled: true,
  getApiUser: () => h.client,
}))
vi.mock('@/services/mutlogApi', async (orig) => {
  const real = await orig<typeof import('@/services/mutlogApi')>()
  return {
    ...real,
    clientApi: h.api,
    publicApi: { ...real.publicApi, settings: async () => ({ ...real.EMPTY_PUBLIC_SETTINGS, paymentInstructions: 'Payez par Mobile Money au 0197000000.' }) },
    sharedApi: {
      ...real.sharedApi,
      notifications: async () => [], markNotificationRead: async () => ({}), markNotificationsRead: async () => ({}),
      reviews: h.reviews, reviewTransport: h.reviewTransport,
    },
  }
})

import App from './App'
import { ConfirmHost } from '@/components/shared/confirm'
import { ApiError } from '@/services/api'

beforeAll(() => {
  ;(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
  window.scrollTo = () => {}
  Element.prototype.scrollIntoView = () => {}
})
beforeEach(() => { cleanup(); vi.clearAllMocks() })

const open = (path: string) => render(<MemoryRouter initialEntries={[path]}><App /><ConfirmHost /></MemoryRouter>)
const text = () => (document.body.textContent ?? '').replace(/[\u202F\u00A0]/g, ' ')

describe('espace client branché sur l’API', () => {
  it('tableau de bord : demandes, expéditions et économies viennent du serveur', async () => {
    open('/client/dashboard')
    expect(await screen.findByText(/Bienvenue Sophie/)).toBeTruthy()
    await waitFor(() => expect(text()).toContain('Cotonou → Natitingou'))
    expect(text()).toContain('Lokossa → Cotonou')
    expect(text()).toContain('150 000 FCFA') // forfait 200 000 − part 50 000 ; l'expédition au tarif à la tonne ne compte pas
    expect(h.api.requests).toHaveBeenCalled()
    expect(h.api.shipments).toHaveBeenCalled()
  })

  it('tableau de bord : une panne de l’API est signalée, sans chiffres trompeurs', async () => {
    h.api.requests.mockRejectedValueOnce(new Error('Impossible de joindre l’API MUTLOG'))
    open('/client/dashboard')
    expect(await screen.findByText(/Impossible de joindre l’API MUTLOG/)).toBeTruthy()
    expect(text()).not.toContain('Aucune demande pour le moment')
  })

  it('liste des demandes : badge « En recherche » (le compteur de propositions n’est connu que sur la fiche)', async () => {
    open('/client/demandes')
    expect((await screen.findAllByText('Lokossa → Cotonou')).length).toBeGreaterThan(0)
    expect(text()).toContain('En recherche')
    expect(text()).toContain('Confirmé')
  })

  it('publication d’une demande : envoyée à l’API, puis retour à la liste', async () => {
    open('/client/demandes/nouvelle')
    fireEvent.change(await screen.findByLabelText(/Destination/), { target: { value: 'Natitingou' } })
    fireEvent.change(screen.getByLabelText(/Date souhaitée/), { target: { value: '2026-12-01' } })
    fireEvent.change(screen.getByLabelText(/Poids/), { target: { value: '2,5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Publier ma demande' }))
    await waitFor(() => expect(h.api.createRequest).toHaveBeenCalledTimes(1))
    expect(h.api.createRequest.mock.calls[0][0]).toMatchObject({ from: 'Cotonou', to: 'Natitingou', date: '2026-12-01', goods: 'agricoles', weightT: 2.5, contact: '0197000011' })
    expect((await screen.findAllByText('Mes demandes')).length).toBeGreaterThan(0) // titre de la liste (aussi présent dans le menu)
  })

  it('fiche d’une demande : correspondances du serveur, réservation puis annulation', async () => {
    open('/client/demandes/11')
    expect(await screen.findByText('Correspondances trouvées')).toBeTruthy()
    expect(screen.getByLabelText('Compatibilité 92 %')).toBeTruthy()
    expect(text()).toContain('Propositions (1)')
    expect(text()).toContain('Jean Transport')

    fireEvent.click(screen.getByRole('button', { name: 'Réserver' }))
    await waitFor(() => expect(h.api.reserve).toHaveBeenCalledWith(11, 3))
    expect(await screen.findByText(/Réservation envoyée/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Annuler la demande' }))
    const buttons = await screen.findAllByRole('button', { name: 'Annuler la demande' })
    fireEvent.click(buttons[buttons.length - 1]) // bouton de la fenêtre de confirmation
    await waitFor(() => expect(h.api.cancelRequest).toHaveBeenCalledWith(11))
  })

  it('fiche d’une demande introuvable (404) : message clair', async () => {
    h.api.request.mockRejectedValueOnce(new ApiError('Not Found.', 404))
    open('/client/demandes/999')
    expect(await screen.findByText('Demande introuvable.')).toBeTruthy()
  })

  it('réservations : trajet, date et transporteur viennent de l’offre renvoyée par l’API', async () => {
    open('/client/reservations')
    expect((await screen.findAllByText('Lokossa → Cotonou')).length).toBeGreaterThan(0)
    expect(text()).toContain('Jean Transport')
    expect(text()).toContain('En attente')
  })

  it('expéditions : liste puis fiche', async () => {
    open('/client/expeditions')
    expect((await screen.findAllByText('MUT-2026-000031')).length).toBeGreaterThan(0) // tableau + vue mobile
    expect(text()).toContain('55 000 FCFA')
  })

  it('fiche d’une expédition : traçabilité, réception, évaluation et paiement via l’API', async () => {
    open('/client/expeditions/31')
    expect(await screen.findByText('Itinéraire et traçabilité')).toBeTruthy()
    expect(text()).toContain('55 000 FCFA')
    expect(text()).toContain('Jean Transport')
    expect(text()).toContain('Téléphone')

    fireEvent.click(await screen.findByRole('button', { name: 'J\'ai bien reçu ma marchandise' }))
    await waitFor(() => expect(h.api.confirmReceipt).toHaveBeenCalledWith(31))

    fireEvent.click(await screen.findByRole('button', { name: 'Envoyer mon évaluation' }))
    await waitFor(() => expect(h.reviewTransport).toHaveBeenCalledWith(31, { toId: 21, rating: 5, comment: undefined }))

    fireEvent.click(screen.getByRole('button', { name: 'Payer' }))
    expect(await screen.findByText(/Payez par Mobile Money/)).toBeTruthy()
    fireEvent.change(screen.getByLabelText(/Référence de la transaction/), { target: { value: 'TXN-778' } })
    fireEvent.click(screen.getByRole('button', { name: 'J\'ai effectué le paiement' }))
    // Laravel exige « method » : il doit partir avec la référence.
    await waitFor(() => expect(h.api.declarePayment).toHaveBeenCalledWith(41, 'mobile_money', 'TXN-778'))
  })

  it('fiche d’une expédition déjà évaluée : plus de formulaire d’évaluation', async () => {
    h.reviews.mockResolvedValueOnce([{ id: 9, transportId: 31, fromId: 1, toId: 21, rating: 4, reported: false, createdAt: '2026-10-17T10:00:00Z' }])
    open('/client/expeditions/31')
    expect(await screen.findByText(/Vous avez évalué ce transport/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Envoyer mon évaluation' })).toBeNull()
  })

  it('fiche d’une expédition inconnue (404) : message clair', async () => {
    h.api.shipment.mockRejectedValueOnce(new ApiError('Not Found.', 404))
    open('/client/expeditions/999')
    expect(await screen.findByText('Expédition introuvable.')).toBeTruthy()
  })

  it('paiements : à payer et reçu d’un paiement confirmé', async () => {
    open('/client/paiements')
    expect((await screen.findAllByText('MUT-2026-000031')).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Payer' }).length).toBeGreaterThan(0)
    fireEvent.click(screen.getAllByRole('button', { name: 'Reçu' })[0])
    expect(await screen.findByText(/Reçu REC-2026-0001/)).toBeTruthy()
    expect(text()).toContain('Client : Sophie Adjovi')
  })
})
