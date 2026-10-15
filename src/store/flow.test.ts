import { describe, expect, it } from 'vitest'
import { buildSeed } from './seed'
import * as L from './logic'
import { findMatches } from '@/domain/matching'

const must = <T,>(r: { ok: boolean; value?: T; error?: string }) => {
  if (!r.ok) throw new Error((r as { error: string }).error)
  return r.value as T
}

describe('parcours complet (CDC §29)', () => {
  it('Lokossa → Cotonou : demande, regroupement validé par l\'admin, confirmation, paiement, livraison, évaluation', () => {
    const db = buildSeed()
    const pooling = must(L.proposePooling(db, 'u_admin', 'o3', ['r_koffi', 'r_mireille', 'r_gilbert']))
    expect(pooling.finance).toMatchObject({ gross: 200000, commission: 20000, netCarrier: 180000 })
    expect(pooling.shares.map((s) => s.amount)).toEqual([50000, 100000, 50000])
    expect(db.requests.find((r) => r.id === 'r_koffi')!.status).toBe('mutualisation')

    // le transporteur ne peut pas confirmer avant la validation de l'admin
    expect(L.respondPooling(db, 'u_jean', pooling.id, true).ok).toBe(false)
    must(L.validatePooling(db, 'u_admin', pooling.id))
    // un autre transporteur ne peut pas répondre à sa place
    expect(L.respondPooling(db, 'u_marius', pooling.id, true).ok).toBe(false)

    const ref = must(L.respondPooling(db, 'u_jean', pooling.id, true))
    expect(ref).toMatch(/^MUT-\d{4}-\d{6}$/)
    const t = db.transports.find((x) => x.ref === ref)!
    expect(db.offers.find((o) => o.id === 'o3')!.status).toBe('complete')
    const pays = db.payments.filter((p) => p.transportId === t.id)
    expect(pays.map((p) => p.amount).sort((a, b) => a - b)).toEqual([50000, 50000, 100000])

    // paiement : déclaration client puis validation manuelle admin
    expect(L.setPaymentStatus(db, 'u_admin', pays[0].id, 'confirme').ok).toBe(false)
    must(L.declarePayment(db, pays[0].clientId, pays[0].id, 'mobile_money', 'MM123456789'))
    must(L.setPaymentStatus(db, 'u_admin', pays[0].id, 'confirme'))
    expect(db.payments.find((p) => p.id === pays[0].id)!.receiptNo).toMatch(/^REC-/)

    // suivi du transport
    expect(L.advanceTransport(db, 'u_jean', t.id, 'livree').ok).toBe(false)
    must(L.advanceTransport(db, 'u_jean', t.id, 'en_cours'))
    must(L.addPosition(db, 'u_jean', t.id, 6.9, 2.0, 'Passage à Bohicon'))
    must(L.advanceTransport(db, 'u_jean', t.id, 'arrive_destination'))
    must(L.advanceTransport(db, 'u_jean', t.id, 'livree'))
    expect(L.advanceTransport(db, 'u_jean', t.id, 'terminee').ok).toBe(false) // seul le client / l'admin clôture
    must(L.advanceTransport(db, 'u_koffi', t.id, 'terminee'))
    expect(db.commissions.find((c) => c.transportId === t.id)!.status).toBe('acquise')

    // évaluation réciproque, une seule fois
    must(L.submitReview(db, 'u_koffi', t.id, 'u_jean', 5, 'Parfait'))
    expect(L.submitReview(db, 'u_koffi', t.id, 'u_jean', 4).ok).toBe(false)
    must(L.submitReview(db, 'u_jean', t.id, 'u_koffi', 5))
    expect(L.submitReview(db, 'u_koffi', t.id, 'u_mireille', 5).ok).toBe(false)
  })

  it('refuse un regroupement qui dépasse la capacité ou une demande incompatible', () => {
    const db = buildSeed()
    expect(L.proposePooling(db, 'u_admin', 'o3', ['r_koffi', 'r_mireille', 'r_gilbert', 'r_s1']).ok).toBe(false)
  })

  it('refus du transporteur : les demandes retournent en recherche', () => {
    const db = buildSeed()
    const p = must(L.proposePooling(db, 'u_admin', 'o3', ['r_koffi']))
    must(L.validatePooling(db, 'u_admin', p.id))
    must(L.respondPooling(db, 'u_jean', p.id, false))
    expect(db.requests.find((r) => r.id === 'r_koffi')!.status).toBe('recherche')
  })

  it('un transporteur non validé ne peut pas publier ; un client ne peut pas réserver au-delà de la capacité', () => {
    const db = buildSeed()
    const offer = { vehicleId: 'v5', from: 'Parakou', to: 'Cotonou', date: L.today(), totalCapacityT: 10, availableT: 5, goodsAccepted: ['generales' as const], pricingMode: 'tonne' as const, price: 30000 }
    expect(L.createOffer(db, 'u_fatiou', offer).ok).toBe(false)
    must(L.setUserStatus(db, 'u_admin', 'u_fatiou', 'actif'))
    expect(L.createOffer(db, 'u_fatiou', offer).ok).toBe(true)
    db.requests.find((r) => r.id === 'r_s1')!.weightT = 50
    expect(L.reserve(db, 'u_sophie', 'r_s1', 'o1').ok).toBe(false)
  })

  it('matching sur les données de démonstration', () => {
    const db = buildSeed()
    const r = db.requests.find((x) => x.id === 'r_koffi')!
    const m = findMatches(r, db.offers, db.settings)
    expect(m[0].offer.id).toBe('o3')
    expect(m.map((x) => x.offer.id)).toContain('o4')
  })

  it('inscription : numéro invalide, doublon, transporteur en attente de validation', () => {
    const db = buildSeed()
    const base = { role: 'client' as const, userType: 'producteur' as const, firstName: 'A', lastName: 'B', address: 'x', city: 'Cotonou', password: 'motdepasse1' }
    expect(L.register(db, { ...base, phone: '123' }).ok).toBe(false)
    expect(L.register(db, { ...base, phone: '01 00 00 00 11' }).ok).toBe(false)
    const u = must(L.register(db, { ...base, role: 'transporteur', userType: 'entreprise_transport', phone: '01 55 00 00 01' }))
    expect(u.status).toBe('en_attente')
    expect(L.login(db, '0155000001', 'motdepasse1').ok).toBe(true)
  })

  it('administration : modification de compte, documents, notification d\'annulation', () => {
    const db = buildSeed()
    const patch = { firstName: 'Kofi', lastName: 'Adjovi', address: 'Quartier Gbèdji', city: 'Lokossa', userType: 'producteur' as const }
    must(L.updateUser(db, 'u_admin', 'u_koffi', patch))
    expect(db.users.find((u) => u.id === 'u_koffi')!.firstName).toBe('Kofi')
    expect(L.updateUser(db, 'u_admin', 'u_koffi', { ...patch, email: 'faux' }).ok).toBe(false)
    must(L.setDocuments(db, 'u_jean', ['IFU.pdf', 'Assurance.pdf']))
    expect(db.users.find((u) => u.id === 'u_jean')!.documents).toHaveLength(2)
    const before = db.notifications.filter((n) => n.userId === 'u_koffi').length
    must(L.setRequestStatusAdmin(db, 'u_admin', 'r_koffi', 'annule'))
    expect(db.notifications.filter((n) => n.userId === 'u_koffi').length).toBe(before + 1)
  })
})
