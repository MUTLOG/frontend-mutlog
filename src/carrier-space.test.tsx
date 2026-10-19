// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Espace transporteur : toutes les données viennent de l'API Laravel (simulée ici), jamais de la base locale.
const h = vi.hoisted(() => {
  const vehicle = { id: 7, ownerId: 21, type: 'Camion 12 t', brand: 'Renault', plate: 'AB-123-CD', capacityT: 12, volumeM3: 40, goodsAccepted: ['generales', 'agricoles'], available: true, active: true }
  const offer = {
    id: 3, from: 'Lokossa', to: 'Cotonou', date: '2099-11-02', totalCapacityT: 12, availableT: 6, goodsAccepted: ['agricoles'], pricingMode: 'forfait', price: 200000, status: 'ouverte',
    vehicle: { type: 'Camion 12 t', capacityT: 12 }, transporter: { id: 21, displayName: 'Jean Transport', firstName: 'Jean' },
  }
  const finance = { gross: 200000, ratePct: 8, commission: 16000, netCarrier: 184000, bearer: 'transporteur' }
  const shares = [{ requestId: 11, clientId: 1, weightT: 2, amount: 100000, payable: 108000, clientName: 'Sophie' }, { requestId: 12, clientId: 2, weightT: 4, amount: 100000, payable: 108000, clientName: 'Koffi' }]
  const reservation = { id: 51, requestId: 11, offerId: 3, clientId: 1, transporterId: 21, weightT: 2, status: 'en_attente', offer, request: { id: 11, client: { id: 1, firstName: 'Sophie' } }, createdAt: '2099-10-15T09:00:00Z' }
  const transports = [
    {
      id: 31, ref: 'MUT-2099-000031', status: 'en_cours', poolingId: 5, offer, createdAt: '2099-10-16T08:00:00Z', breakdown: null,
      events: [{ id: 1, kind: 'statut', label: 'Confirmé', lat: null, lng: null, at: '2099-10-16T08:00:00Z' }],
      finance, clients: [{ clientId: 1, requestId: 11, weightT: 2, amount: 100000, payable: 108000, name: 'Sophie', phone: '0197000011' }],
      payments: [{ id: 41, transportId: 31, requestId: 11, clientId: 1, amount: 108000, method: 'mobile_money', status: 'en_attente', createdAt: '2099-10-16T08:00:00Z' }],
    },
    {
      id: 32, ref: 'MUT-2099-000032', status: 'terminee', poolingId: 6, offer: { ...offer, id: 4 }, createdAt: '2099-09-10T08:00:00Z', breakdown: null, events: [],
      finance, clients: [{ clientId: 2, requestId: 12, weightT: 4, amount: 100000, payable: 108000, name: 'Koffi' }],
      payments: [{ id: 42, transportId: 32, requestId: 12, clientId: 2, amount: 108000, method: 'mobile_money', status: 'confirme', createdAt: '2099-09-10T08:00:00Z' }],
    },
  ]
  return {
    vehicle, offer, finance, shares, reservation, transports,
    carrier: { id: 21, role: 'transporteur', userType: 'transporteur', firstName: 'Jean', lastName: 'K.', phone: '0197000021', email: null, address: 'Lokossa', city: 'Lokossa', status: 'actif' },
    api: {
      offers: vi.fn(async (_q?: string) => [offer] as unknown),
      createOffer: vi.fn(async (_i: unknown) => ({ ...offer, id: 99 }) as unknown),
      offer: vi.fn(async (_id: unknown) => ({ ...offer, compatibleRequests: 2, reservations: [reservation] }) as unknown),
      cancelOffer: vi.fn(async (_id: unknown) => ({}) as unknown),
      vehicles: vi.fn(async () => [vehicle] as unknown),
      createVehicle: vi.fn(async (_i: unknown) => vehicle as unknown),
      updateVehicle: vi.fn(async (_id: unknown, _i: unknown) => vehicle as unknown),
      reservations: vi.fn(async (_q?: string) => [reservation] as unknown),
      poolings: vi.fn(async (_q?: string) => [{ id: 5, offerId: 3, status: 'validee', finance, shares, offer }] as unknown),
      pooling: vi.fn(async (_id: unknown) => ({
        id: 5, offerId: 3, status: 'validee', finance, shares, offer,
        goods: [{ clientName: 'Sophie', goods: 'agricoles', weightT: 2, parcels: 5, description: '5 sacs de maïs', requirements: 'Au sec', phone: null }],
      }) as unknown),
      respondToPooling: vi.fn(async (_id: unknown, _a: boolean) => ({ accepted: true, transportRef: 'MUT-2099-000033' }) as unknown),
      transports: vi.fn(async (_q?: string) => transports as unknown),
      revenue: vi.fn(async () => ({ netReceived: 184000, netPending: 184000, commissionPaid: 16000, monthly: [{ month: '2099-09', net: 184000 }, { month: '2099-10', net: 0 }] }) as unknown),
      breakdowns: vi.fn(async (_q?: string) => [] as unknown),
      createBreakdown: vi.fn(async (_i: unknown) => ({ data: { id: 1 }, message: 'Signalement enregistré. 1 client a été prévenu par notification et SMS.' }) as unknown),
    },
    updateStatus: vi.fn(async (_id: unknown, _s: unknown) => ({}) as unknown),
    recordPosition: vi.fn(async (_id: unknown, _p: unknown) => ({}) as unknown),
  }
})

vi.mock('@/services/api', async (orig) => ({
  ...(await orig<typeof import('@/services/api')>()),
  getApiUser: () => h.carrier,
}))
vi.mock('@/services/mutlogApi', async (orig) => {
  const real = await orig<typeof import('@/services/mutlogApi')>()
  return {
    ...real,
    carrierApi: h.api,
    publicApi: { ...real.publicApi, settings: async () => ({ ...real.EMPTY_PUBLIC_SETTINGS, commissionPct: 8, commissionBearer: 'transporteur' as const }) },
    sharedApi: {
      ...real.sharedApi, notifications: async () => [], markNotificationRead: async () => ({}), markNotificationsRead: async () => ({}),
      updateTransportStatus: h.updateStatus, recordPosition: h.recordPosition,
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

describe('espace transporteur branché sur l’API', () => {
  it('tableau de bord : trajets, réservations, regroupement à confirmer et revenus viennent du serveur', async () => {
    open('/transporteur/dashboard')
    expect(await screen.findByText(/Bienvenue Jean/, undefined, { timeout: 5000 })).toBeTruthy() // premier rendu : chargement des modules
    await waitFor(() => expect(text()).toContain('1 regroupement à confirmer'))
    expect(text()).toContain('Lokossa → Cotonou')
    expect(h.api.offers).toHaveBeenCalled()
    expect(h.api.revenue).toHaveBeenCalled()
  })

  it('tableau de bord : une panne en cours est signalée au transporteur', async () => {
    h.api.transports.mockResolvedValueOnce([{ ...h.transports[0], breakdown: { id: 1, kind: 'pneu', urgency: 'elevee', location: 'Bohicon', status: 'en_attente' } }])
    open('/transporteur/dashboard')
    expect(await screen.findByText(/Panne signalée sur 1 transport/)).toBeTruthy()
  })

  it('tableau de bord : une panne de l’API est signalée, sans chiffres trompeurs', async () => {
    h.api.revenue.mockRejectedValueOnce(new Error('Impossible de joindre l’API MUTLOG'))
    open('/transporteur/dashboard')
    expect(await screen.findByText(/Impossible de joindre l’API MUTLOG/)).toBeTruthy()
  })

  it('mes trajets : liste depuis l’API', async () => {
    open('/transporteur/trajets')
    expect((await screen.findAllByText('Lokossa → Cotonou')).length).toBeGreaterThan(0)
    expect(text()).toContain('Actif')
  })

  it('publier un trajet : envoyé à l’API avec le véhicule, les marchandises et le tarif', async () => {
    open('/transporteur/trajets/nouveau')
    fireEvent.change(await screen.findByLabelText(/Destination/), { target: { value: 'Cotonou' } })
    fireEvent.change(screen.getByLabelText(/Date de départ/), { target: { value: '2099-12-01' } })
    fireEvent.change(screen.getByLabelText(/Mode de tarification/), { target: { value: 'forfait' } })
    fireEvent.change(screen.getByLabelText(/Prix du trajet/), { target: { value: '200000' } })
    expect(text()).toContain('MUTLOG perçoit une commission de 8 %')
    fireEvent.click(screen.getByRole('button', { name: 'Publier mon offre' }))
    await waitFor(() => expect(h.api.createOffer).toHaveBeenCalledTimes(1))
    expect(h.api.createOffer.mock.calls[0][0]).toMatchObject({ vehicleId: 7, from: 'Lokossa', to: 'Cotonou', date: '2099-12-01', totalCapacityT: 12, availableT: 12, pricingMode: 'forfait', price: 200000, goodsAccepted: ['generales', 'agricoles'] })
    expect((await screen.findAllByText('Lokossa → Cotonou')).length).toBeGreaterThan(0) // détail de l'offre créée
  })

  it('publier un trajet sans véhicule : invitation à en enregistrer un', async () => {
    h.api.vehicles.mockResolvedValueOnce([])
    open('/transporteur/trajets/nouveau')
    expect(await screen.findByText(/Enregistrez d'abord un véhicule/)).toBeTruthy()
  })

  it('détail d’un trajet : correspondances, réservations du serveur puis annulation', async () => {
    open('/transporteur/trajets/3')
    expect(await screen.findByText('Correspondance trouvée')).toBeTruthy()
    expect(text()).toContain('2 demandes compatibles')
    expect(text()).toContain('Sophie')
    fireEvent.click(screen.getByRole('button', { name: 'Annuler le trajet' }))
    const buttons = await screen.findAllByRole('button', { name: 'Annuler le trajet' })
    fireEvent.click(buttons[buttons.length - 1])
    await waitFor(() => expect(h.api.cancelOffer).toHaveBeenCalledWith(3))
  })

  it('trajet inconnu (404) : message clair', async () => {
    h.api.offer.mockRejectedValueOnce(new ApiError('Not Found.', 404))
    open('/transporteur/trajets/999')
    expect(await screen.findByText('Trajet introuvable.')).toBeTruthy()
  })

  it('demandes reçues : accepter un regroupement appelle l’API et affiche la référence du transport', async () => {
    open('/transporteur/demandes')
    fireEvent.click(await screen.findByRole('button', { name: 'Accepter' }))
    await waitFor(() => expect(h.api.respondToPooling).toHaveBeenCalledWith(5, true))
    expect(await screen.findByText(/MUT-2099-000033/)).toBeTruthy()
    expect(text()).toContain('MUTLOG prépare le regroupement')
  })

  it('demandes reçues : refuser demande confirmation', async () => {
    open('/transporteur/demandes')
    fireEvent.click(await screen.findByRole('button', { name: 'Refuser' }))
    const buttons = await screen.findAllByRole('button', { name: 'Refuser' })
    fireEvent.click(buttons[buttons.length - 1])
    await waitFor(() => expect(h.api.respondToPooling).toHaveBeenCalledWith(5, false))
  })

  it('détail d’une demande reçue : marchandises, exigences et confidentialité des coordonnées', async () => {
    open('/transporteur/demandes/5')
    expect(await screen.findByText('Marchandises')).toBeTruthy()
    expect(text()).toContain('5 sacs de maïs')
    expect(text()).toContain('Exigences : Au sec')
    expect(text()).toContain('communiquées après la confirmation')
  })

  it('réservations : client et statut viennent de l’API', async () => {
    open('/transporteur/reservations')
    expect((await screen.findAllByText('Sophie')).length).toBeGreaterThan(0)
    expect(text()).toContain('En attente')
  })

  it('véhicules : liste, bascule de disponibilité et ajout via l’API transporteur', async () => {
    open('/transporteur/vehicules')
    expect((await screen.findAllByText('Camion 12 t')).length).toBeGreaterThan(0)
    fireEvent.click(screen.getAllByRole('button', { name: 'Oui' })[0]) // Disponible → Non
    await waitFor(() => expect(h.api.updateVehicle).toHaveBeenCalledTimes(1))
    expect(h.api.updateVehicle.mock.calls[0][1]).toMatchObject({ plate: 'AB-123-CD', available: false, active: true })

    fireEvent.click(screen.getByRole('button', { name: /Ajouter un véhicule/ }))
    fireEvent.change(await screen.findByLabelText(/Type de véhicule/), { target: { value: 'Camion 5 t' } })
    fireEvent.change(screen.getByLabelText(/Immatriculation/), { target: { value: 'EF-456-GH' } })
    fireEvent.change(screen.getByLabelText(/Capacité \(t\)/), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(h.api.createVehicle).toHaveBeenCalledTimes(1))
    expect(h.api.createVehicle.mock.calls[0][0]).toMatchObject({ type: 'Camion 5 t', plate: 'EF-456-GH', capacityT: 5 })
    expect(h.api.createVehicle.mock.calls[0][0]).not.toHaveProperty('ownerId') // le transporteur est le propriétaire
  })

  it('transports : faire avancer le statut et enregistrer une position passent par l’API', async () => {
    open('/transporteur/transports')
    fireEvent.click(await screen.findByRole('button', { name: 'Arrivé à destination' }))
    await waitFor(() => expect(h.updateStatus).toHaveBeenCalledWith(31, 'arrive_destination'))

    fireEvent.click(screen.getAllByRole('button', { name: 'Carte et positions' })[0])
    fireEvent.change(await screen.findByLabelText('Localité'), { target: { value: 'Bohicon' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(h.recordPosition).toHaveBeenCalledTimes(1))
    expect(h.recordPosition.mock.calls[0][1]).toMatchObject({ label: 'Passage à Bohicon' })
  })

  it('transports : une panne en cours est affichée et ne peut pas être signalée deux fois', async () => {
    h.api.transports.mockResolvedValueOnce([{ ...h.transports[0], breakdown: { id: 1, kind: 'pneu', urgency: 'elevee', location: 'Bohicon', status: 'prise_en_charge' } }])
    open('/transporteur/transports')
    expect(await screen.findByText(/Pneu crevé signalé à Bohicon/)).toBeTruthy()
    expect(text()).toContain('pris en charge par MUTLOG')
    expect(document.querySelector('a[href="/transporteur/pannes?transport=31"]')).toBeNull() // le lien de la carte (le menu latéral reste)
  })

  it('transports : le lien « Signaler une panne » de la carte présélectionne ce transport', async () => {
    const second = { ...h.transports[0], id: 33, ref: 'MUT-2099-000033', status: 'confirmee' }
    h.api.transports.mockResolvedValueOnce([h.transports[0], second]).mockResolvedValueOnce([h.transports[0], second]) // page transports, puis page de signalement
    open('/transporteur/transports')
    await screen.findAllByText(/MUT-2099-000033/)
    const link = document.querySelector('a[href="/transporteur/pannes?transport=33"]') as HTMLAnchorElement
    expect(link).toBeTruthy()
    fireEvent.click(link)
    expect(await screen.findByText('Nouveau signalement')).toBeTruthy()
    const select = screen.getByLabelText(/Transport concerné/) as HTMLSelectElement
    await waitFor(() => expect(select.value).toBe('33')) // et non le premier de la liste (31)
  })

  it('revenus : totaux du serveur et détail par transport', async () => {
    open('/transporteur/revenus')
    await waitFor(() => expect(text()).toContain('184 000 FCFA'))
    expect((await screen.findAllByText('MUT-2099-000031')).length).toBeGreaterThan(0)
    expect(text()).toContain('Perçu')
    expect(text()).toContain('Prévu')
  })

  it('paiements : paiements des clients de tous les transports', async () => {
    open('/transporteur/paiements')
    expect((await screen.findAllByText('MUT-2099-000032')).length).toBeGreaterThan(0)
    expect(text()).toContain('Koffi')
    expect(text()).toContain('Sophie')
  })

  it('signaler une panne : seuls les transports signalables sont proposés, le serveur confirme les clients prévenus', async () => {
    open('/transporteur/pannes')
    const select = (await screen.findByLabelText(/Transport concerné/)) as HTMLSelectElement
    await waitFor(() => expect(select.value).toBe('31'))
    expect(select.textContent).not.toContain('MUT-2099-000032') // transport terminé : exclu
    fireEvent.change(screen.getByLabelText(/Localisation actuelle/), { target: { value: 'RNIE 2, près de Bohicon' } })
    fireEvent.change(screen.getByLabelText(/Description de l’incident/), { target: { value: 'Le moteur surchauffe, le camion est arrêté.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le signalement' }))
    await waitFor(() => expect(h.api.createBreakdown).toHaveBeenCalledTimes(1))
    expect(h.api.createBreakdown.mock.calls[0][0]).toMatchObject({ transportId: 31, kind: 'mecanique', urgency: 'elevee', location: 'RNIE 2, près de Bohicon' })
    expect(await screen.findByText(/1 client a été prévenu par notification et SMS/)).toBeTruthy()
  })

  it('signaler une panne : refus du serveur affiché tel quel', async () => {
    h.api.createBreakdown.mockRejectedValueOnce(new ApiError('Une panne est déjà signalée pour ce transport et en cours de traitement par MUTLOG.', 422))
    open('/transporteur/pannes')
    await screen.findByLabelText(/Transport concerné/)
    fireEvent.change(screen.getByLabelText(/Localisation actuelle/), { target: { value: 'Bohicon centre' } })
    fireEvent.change(screen.getByLabelText(/Description de l’incident/), { target: { value: 'Description suffisamment longue.' } })
    await waitFor(() => expect((screen.getByLabelText(/Transport concerné/) as HTMLSelectElement).value).toBe('31'))
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le signalement' }))
    expect(await screen.findByText(/Une panne est déjà signalée/)).toBeTruthy()
  })
})
