import { describe, expect, it } from 'vitest'
import { fillRate } from './pooling'
import { canTransition, operationRef } from './status'
import { normalizePhone } from './phone'

describe('statuts, identifiants, téléphone, remplissage', () => {
  it('cycle valide et transitions interdites', () => {
    expect(canTransition('recherche', 'confirmee')).toBe(true)
    expect(canTransition('livree', 'en_cours')).toBe(false)
    expect(canTransition('terminee', 'annule')).toBe(false)
  })
  it('identifiant MUT-2026-000125', () => expect(operationRef(2026, 125)).toBe('MUT-2026-000125'))
  it('numéros béninois', () => {
    expect(normalizePhone('01 97 00 00 00')).toBe('+2290197000000')
  })
  it('taux de remplissage borné à 100 %', () => {
    expect(fillRate(4, 10)).toBe(40)
    expect(fillRate(12, 10)).toBe(100)
    expect(fillRate(1, 0)).toBe(0)
  })
})
