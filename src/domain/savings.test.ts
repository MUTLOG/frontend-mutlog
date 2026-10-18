import { describe, expect, it } from 'vitest'
import { clientSavings, type SavingsShipment } from './savings'

const forfait = (price: number, amount: number, status = 'confirmee'): SavingsShipment => ({ status, offer: { pricingMode: 'forfait', price }, share: { amount } })

describe('économies réalisées par le client', () => {
  it('forfait partagé : prix du véhicule seul − part payée', () => {
    expect(clientSavings([forfait(200000, 50000), forfait(100000, 40000)])).toBe(150000 + 60000)
  })
  it('tarif à la tonne : aucune économie', () => {
    expect(clientSavings([{ status: 'confirmee', offer: { pricingMode: 'tonne', price: 30000 }, share: { amount: 30000 } }])).toBe(0)
  })
  it('ignore les expéditions annulées et celles sans part', () => {
    expect(clientSavings([forfait(200000, 50000, 'annule'), { status: 'confirmee', offer: { pricingMode: 'forfait', price: 90000 }, share: null }])).toBe(0)
  })
  it('ne devient jamais négative', () => {
    expect(clientSavings([forfait(40000, 60000)])).toBe(0)
  })
  it('liste vide', () => {
    expect(clientSavings([])).toBe(0)
  })
})
