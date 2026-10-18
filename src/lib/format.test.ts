import { describe, expect, it } from 'vitest'
import { formatFCFA, today, userName } from './format'

describe('helpers de format', () => {
  it('userName : raison sociale, sinon prénom + nom, sinon tiret', () => {
    expect(userName({ company: 'Transports Koffi', firstName: 'Jean', lastName: 'K.' })).toBe('Transports Koffi')
    expect(userName({ firstName: 'Sophie', lastName: 'Adjovi' })).toBe('Sophie Adjovi')
    expect(userName({ firstName: 'Awa', lastName: '' })).toBe('Awa')
    expect(userName(undefined)).toBe('—')
  })
  it('today : date ISO du jour', () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
  it('formatFCFA : séparateur de milliers insécable', () => {
    expect(formatFCFA(350000)).toBe('350\u202F000\u00A0FCFA')
  })
})
