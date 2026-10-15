import { describe, expect, it } from 'vitest'
import { computeFinance, computeShares, splitAmount, transportTotal } from './pricing'
import { findMatches, scoreMatch } from './matching'
import { suggestPooling } from './pooling'
import { canTransition, operationRef } from './status'
import { normalizePhone } from './phone'
import type { Offer, TransportRequest } from './types'

const settings = { cityRadiusKm: 25, dateToleranceDays: 2 }
const offer = (o: Partial<Offer> = {}): Offer => ({
  id: 'o1', transporterId: 't1', vehicleId: 'v1', from: 'Lokossa', to: 'Cotonou', date: '2026-10-15',
  totalCapacityT: 10, availableT: 4, goodsAccepted: ['generales'], pricingMode: 'forfait', price: 200000,
  status: 'ouverte', createdAt: '2026-10-01', ...o,
})
const req = (id: string, weightT: number, o: Partial<TransportRequest> = {}): TransportRequest => ({
  id, clientId: 'c' + id, from: 'Lokossa', to: 'Cotonou', date: '2026-10-15', goods: 'agricoles', weightT,
  description: '', attachments: [], contact: '', status: 'recherche', createdAt: '2026-10-01', ...o,
})

describe('prix et commission (CDC §12-13)', () => {
  it('commission 10 % sur 200 000 FCFA = 20 000, net 180 000', () => {
    const f = computeFinance(200000, 10, 'transporteur')
    expect(f).toMatchObject({ commission: 20000, netCarrier: 180000 })
  })
  it('exemple 1 t / 2 t / 1 t : 50 000 / 100 000 / 50 000', () => {
    expect(splitAmount(200000, [1, 2, 1])).toEqual([50000, 100000, 50000])
  })
  it('le reste d\'arrondi est réparti : la somme est toujours exacte', () => {
    const parts = splitAmount(100000, [1, 1, 1])
    expect(parts.reduce((a, b) => a + b, 0)).toBe(100000)
  })
  it('commission supportée par les clients : le net transporteur est le brut', () => {
    const f = computeFinance(200000, 10, 'clients')
    const shares = computeShares(200000, [
      { requestId: 'a', clientId: 'a', weightT: 1 }, { requestId: 'b', clientId: 'b', weightT: 3 },
    ], 'poids', f)
    expect(f.netCarrier).toBe(200000)
    expect(shares.reduce((s, x) => s + x.payable, 0)).toBe(220000)
  })
  it('tarif par tonne', () => {
    expect(transportTotal({ pricingMode: 'tonne', price: 50000 }, 4)).toBe(200000)
  })
})

describe('matching (CDC §10)', () => {
  it('correspondance exacte : score 100', () => {
    const m = scoreMatch(req('1', 1), offer(), settings)
    expect(m.compatible).toBe(true)
    expect(m.score).toBe(100)
  })
  it('capacité insuffisante : incompatible', () => {
    expect(scoreMatch(req('1', 5), offer(), settings).compatible).toBe(false)
  })
  it('date trop éloignée : incompatible ; date proche : compatible avec score réduit', () => {
    expect(scoreMatch(req('1', 1, { date: '2026-10-25' }), offer(), settings).compatible).toBe(false)
    const close = scoreMatch(req('1', 1, { date: '2026-10-16' }), offer(), settings)
    expect(close.compatible).toBe(true)
    expect(close.score).toBeLessThan(100)
  })
  it('départ voisin compatible (Cotonou / Abomey-Calavi), éloigné non', () => {
    expect(scoreMatch(req('1', 1, { from: 'Abomey-Calavi', to: 'Cotonou' }), offer({ from: 'Cotonou' }), settings).criteria[0].ok).toBe(true)
    expect(scoreMatch(req('1', 1, { from: 'Parakou' }), offer(), settings).compatible).toBe(false)
  })
  it('marchandise non acceptée', () => {
    expect(scoreMatch(req('1', 1), offer({ goodsAccepted: ['materiaux'] }), settings).compatible).toBe(false)
  })
  it('classement par score', () => {
    const list = findMatches(req('1', 1), [offer({ id: 'b', date: '2026-10-16' }), offer({ id: 'a' })], settings)
    expect(list.map((m) => m.offer.id)).toEqual(['a', 'b'])
  })
})

describe('mutualisation (CDC §11)', () => {
  it('regroupe 1 t + 2 t + 1 t dans un camion de 4 t disponibles', () => {
    const picked = suggestPooling(offer(), [req('A', 1), req('B', 2), req('C', 1), req('D', 3)])
    expect(picked.reduce((s, r) => s + r.weightT, 0)).toBe(4)
    expect(picked.length).toBe(3)
  })
  it('ne dépasse jamais la capacité', () => {
    const picked = suggestPooling(offer({ availableT: 3 }), [req('A', 2), req('B', 2), req('C', 1.5)])
    expect(picked.reduce((s, r) => s + r.weightT, 0)).toBeLessThanOrEqual(3)
  })
})

describe('statuts, identifiants, téléphone', () => {
  it('cycle valide et transitions interdites', () => {
    expect(canTransition('confirmee', 'en_cours')).toBe(true)
    expect(canTransition('livree', 'en_cours')).toBe(false)
    expect(canTransition('terminee', 'annule')).toBe(false)
  })
  it('identifiant MUT-2026-000125', () => expect(operationRef(2026, 125)).toBe('MUT-2026-000125'))
  it('numéros béninois', () => {
    expect(normalizePhone('01 97 00 00 00')).toBe('+2290197000000')
    expect(normalizePhone('97000000')).toBe('+2290197000000')
    expect(normalizePhone('+229 01 97 00 00 00')).toBe('+2290197000000')
    expect(normalizePhone('12345')).toBeNull()
  })
})
