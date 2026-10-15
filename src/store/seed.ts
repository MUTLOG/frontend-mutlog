import { computeFinance, computeShares, transportTotal } from '@/domain/pricing'
import { operationRef, STATUS_LABEL } from '@/domain/status'
import type { Offer, TrackingEvent, TransportRequest, User, Vehicle } from '@/domain/types'
import type { OperationStatus } from '@/types/operation'
import type { Db } from './db'
import { demoHash, uid } from './logic'

export const DEMO_PASSWORD = 'MutlogDemo1'

const day = (offset: number) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}
const iso = (offsetDays: number) => {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString()
}

function user(p: Partial<User> & Pick<User, 'id' | 'role' | 'userType' | 'firstName' | 'lastName' | 'phone' | 'city'>): User {
  return { address: p.city, documents: [], passwordHash: demoHash(DEMO_PASSWORD), status: 'actif', createdAt: iso(-200), ...p }
}

export function buildSeed(): Db {
  const db: Db = {
    version: 1,
    users: [], vehicles: [], offers: [], requests: [], reservations: [], poolings: [], transports: [], payments: [],
    commissions: [], reviews: [], notifications: [], messages: [], audit: [],
    settings: { commissionPct: 10, commissionBearer: 'transporteur', shareBasis: 'poids', cityRadiusKm: 25, dateToleranceDays: 2, paymentInstructions: 'Envoyez le montant par Mobile Money au numéro MUTLOG indiqué par l\'administrateur, puis saisissez la référence reçue par SMS.' },
    resets: [], counters: { transport: 124, receipt: 40 }, session: { userId: null },
  }

  db.users.push(
    user({ id: 'u_admin', role: 'admin', userType: 'admin', firstName: 'Administrateur', lastName: 'MUTLOG', phone: '+2290100000001', city: 'Cotonou', email: 'admin@mutlog.bj' }),
    user({ id: 'u_sophie', role: 'client', userType: 'commercant', firstName: 'Sophie', lastName: 'Agbodjan', phone: '+2290100000011', city: 'Cotonou' }),
    user({ id: 'u_koffi', role: 'client', userType: 'producteur', firstName: 'Koffi', lastName: 'Adjovi', phone: '+2290100000012', city: 'Lokossa' }),
    user({ id: 'u_mireille', role: 'client', userType: 'commercant', firstName: 'Mireille', lastName: 'Hounkpè', phone: '+2290100000013', city: 'Lokossa' }),
    user({ id: 'u_gilbert', role: 'client', userType: 'cooperative', firstName: 'Gilbert', lastName: 'Zinsou', company: 'Coopérative AGRO-Couffo', phone: '+2290100000014', city: 'Dogbo' }),
    user({ id: 'u_jean', role: 'transporteur', userType: 'entreprise_transport', firstName: 'Jean', lastName: 'Dossou', company: 'Transport Dossou & Fils', phone: '+2290100000021', city: 'Cotonou', idNumber: 'IFU 3202012345678' }),
    user({ id: 'u_marius', role: 'transporteur', userType: 'transporteur_independant', firstName: 'Marius', lastName: 'Kpadonou', company: 'LogiBénin Express', phone: '+2290100000022', city: 'Bohicon', idNumber: 'IFU 3202087654321' }),
    user({ id: 'u_fatiou', role: 'transporteur', userType: 'proprietaire_camion', firstName: 'Fatiou', lastName: 'Alassane', company: 'Nord Fret', phone: '+2290100000023', city: 'Parakou', status: 'en_attente', createdAt: iso(-2) }),
  )

  const veh = (id: string, ownerId: string, type: string, brand: string, plate: string, capacityT: number, volumeM3: number): Vehicle => ({
    id, ownerId, type, brand, plate, capacityT, volumeM3, goodsAccepted: ['generales', 'agricoles', 'alimentaires'], available: true, active: true,
  })
  db.vehicles.push(
    veh('v1', 'u_jean', 'Camion 12 tonnes', 'Mercedes Actros', 'AB 1234 RB', 12, 60),
    veh('v2', 'u_jean', 'Camion 10 tonnes', 'Renault Kerax', 'AB 5678 RB', 10, 48),
    veh('v3', 'u_marius', 'Camion 15 tonnes', 'MAN TGS', 'CD 4321 RB', 15, 75),
    veh('v4', 'u_marius', 'Camion 8 tonnes', 'Isuzu FVR', 'CD 8765 RB', 8, 38),
    veh('v5', 'u_fatiou', 'Camion 12 tonnes', 'Volvo FH', 'EF 1122 RB', 12, 58),
  )
  db.vehicles[3].goodsAccepted = ['generales', 'materiaux', 'equipements']

  const offer = (o: Partial<Offer> & Pick<Offer, 'id' | 'transporterId' | 'vehicleId' | 'from' | 'to' | 'date' | 'totalCapacityT' | 'availableT' | 'pricingMode' | 'price'>): Offer => ({
    goodsAccepted: ['generales', 'agricoles', 'alimentaires'], status: 'ouverte', createdAt: iso(-3), ...o,
  })
  db.offers.push(
    offer({ id: 'o1', transporterId: 'u_jean', vehicleId: 'v1', from: 'Cotonou', to: 'Natitingou', date: day(7), totalCapacityT: 12, availableT: 6, pricingMode: 'tonne', price: 38000 }),
    offer({ id: 'o2', transporterId: 'u_marius', vehicleId: 'v4', from: 'Cotonou', to: 'Djougou', date: day(9), totalCapacityT: 8, availableT: 3, pricingMode: 'tonne', price: 32000, goodsAccepted: ['generales', 'materiaux', 'equipements'] }),
    offer({ id: 'o3', transporterId: 'u_jean', vehicleId: 'v2', from: 'Lokossa', to: 'Cotonou', date: day(7), totalCapacityT: 10, availableT: 4, pricingMode: 'forfait', price: 200000 }),
    offer({ id: 'o4', transporterId: 'u_marius', vehicleId: 'v3', from: 'Lokossa', to: 'Cotonou', date: day(8), totalCapacityT: 15, availableT: 7, pricingMode: 'tonne', price: 52000 }),
    offer({ id: 'o5', transporterId: 'u_marius', vehicleId: 'v3', from: 'Bohicon', to: 'Cotonou', date: day(10), totalCapacityT: 8, availableT: 8, pricingMode: 'tonne', price: 18000 }),
    offer({ id: 'o6', transporterId: 'u_jean', vehicleId: 'v1', from: 'Cotonou', to: 'Djougou', date: day(10), totalCapacityT: 12, availableT: 5, pricingMode: 'tonne', price: 30000, goodsAccepted: ['generales', 'materiaux', 'equipements', 'conteneur'] }),
    offer({ id: 'o7', transporterId: 'u_jean', vehicleId: 'v1', from: 'Porto-Novo', to: 'Cotonou', date: day(12), totalCapacityT: 12, availableT: 11, pricingMode: 'forfait', price: 90000, goodsAccepted: ['generales', 'equipements', 'conteneur'] }),
  )

  const req = (r: Partial<TransportRequest> & Pick<TransportRequest, 'id' | 'clientId' | 'from' | 'to' | 'date' | 'goods' | 'weightT'>): TransportRequest => ({
    description: '', attachments: [], contact: '', status: 'recherche', createdAt: iso(-2), ...r,
  })
  const phoneOf = (id: string) => db.users.find((u) => u.id === id)!.phone
  db.requests.push(
    req({ id: 'r_koffi', clientId: 'u_koffi', from: 'Lokossa', to: 'Cotonou', date: day(7), goods: 'agricoles', weightT: 1, parcels: 20, description: 'Sacs de maïs', contact: phoneOf('u_koffi') }),
    req({ id: 'r_mireille', clientId: 'u_mireille', from: 'Lokossa', to: 'Cotonou', date: day(7), goods: 'agricoles', weightT: 2, parcels: 40, description: 'Manioc et igname', contact: phoneOf('u_mireille') }),
    req({ id: 'r_gilbert', clientId: 'u_gilbert', from: 'Dogbo', to: 'Cotonou', date: day(8), goods: 'agricoles', weightT: 1, parcels: 22, description: 'Noix de cajou', contact: phoneOf('u_gilbert') }),
    req({ id: 'r_s1', clientId: 'u_sophie', from: 'Cotonou', to: 'Natitingou', date: day(7), goods: 'alimentaires', weightT: 2.5, parcels: 5, description: '5 palettes de produits alimentaires', contact: phoneOf('u_sophie'), createdAt: iso(-1) }),
    req({ id: 'r_s2', clientId: 'u_sophie', from: 'Cotonou', to: 'Djougou', date: day(9), goods: 'materiaux', weightT: 2, description: 'Matériaux de construction', contact: phoneOf('u_sophie'), createdAt: iso(-2) }),
  )

  /** Construit un regroupement + transport (statut au choix) avec paiements et commission. */
  function operation(opts: {
    offerId: string; reqIds: string[]; status: OperationStatus; daysAgo: number; paid: boolean; reviews?: boolean; events?: TrackingEvent[]
  }) {
    const o = db.offers.find((x) => x.id === opts.offerId)!
    const reqs = opts.reqIds.map((id) => db.requests.find((r) => r.id === id)!)
    const total = reqs.reduce((s, r) => s + r.weightT, 0)
    const gross = transportTotal(o, total)
    const finance = computeFinance(gross, db.settings.commissionPct, db.settings.commissionBearer)
    const shares = computeShares(gross, reqs.map((r) => ({ requestId: r.id, clientId: r.clientId, weightT: r.weightT })), db.settings.shareBasis, finance)
    db.counters.transport += 1
    const t = { id: uid('t'), ref: operationRef(new Date().getFullYear(), db.counters.transport), poolingId: uid('p'), offerId: o.id, status: opts.status, events: [] as TrackingEvent[] }
    db.poolings.push({ id: t.poolingId, offerId: o.id, requestIds: opts.reqIds, status: 'confirmee', shares, finance, transportId: t.id, createdAt: iso(-opts.daysAgo - 3) })
    const flow: OperationStatus[] = ['confirmee', 'en_cours', 'arrive_destination', 'livree', 'terminee']
    flow.slice(0, flow.indexOf(opts.status) + 1).forEach((s, i) => t.events.push({ id: uid('e'), transportId: t.id, at: iso(-opts.daysAgo + i), kind: 'statut', label: STATUS_LABEL[s] }))
    if (opts.events) t.events.push(...opts.events.map((e) => ({ ...e, transportId: t.id })))
    db.transports.push(t)
    reqs.forEach((r) => Object.assign(r, { status: opts.status, poolingId: t.poolingId }))
    db.commissions.push({ id: uid('c'), transportId: t.id, gross, ratePct: finance.ratePct, commission: finance.commission, netCarrier: finance.netCarrier, status: opts.status === 'terminee' ? 'acquise' : 'prevue' })
    shares.forEach((s) => {
      const confirmedAt = iso(-opts.daysAgo - 1)
      db.counters.receipt += opts.paid ? 1 : 0
      db.payments.push({
        id: uid('pay'), transportId: t.id, clientId: s.clientId, requestId: s.requestId, amount: s.payable, method: 'mobile_money',
        status: opts.paid ? 'confirme' : 'en_attente', reference: opts.paid ? 'MM' + Math.floor(Math.random() * 9e8 + 1e8) : undefined,
        createdAt: iso(-opts.daysAgo - 2), confirmedAt: opts.paid ? confirmedAt : undefined,
        receiptNo: opts.paid ? `REC-${new Date().getFullYear()}-${String(db.counters.receipt).padStart(6, '0')}` : undefined,
      })
    })
    if (opts.reviews) {
      db.reviews.push({ id: uid('rv'), transportId: t.id, fromId: reqs[0].clientId, toId: o.transporterId, rating: [5, 4, 5, 4, 5][db.reviews.length % 5], comment: db.reviews.length % 2 ? 'Livraison à l\'heure, camion propre.' : 'Très professionnel.', reported: false, createdAt: iso(-opts.daysAgo + 3) })
    }
    return t
  }

  // Historique : opérations terminées sur 6 mois (revenus, statistiques, évaluations)
  const history: { offer: Partial<Offer>; client: string; from: string; to: string; weight: number; ago: number }[] = [
    { offer: { transporterId: 'u_jean', vehicleId: 'v1', pricingMode: 'tonne', price: 36000 }, client: 'u_sophie', from: 'Cotonou', to: 'Parakou', weight: 5, ago: 150 },
    { offer: { transporterId: 'u_jean', vehicleId: 'v2', pricingMode: 'tonne', price: 33000 }, client: 'u_sophie', from: 'Cotonou', to: 'Bohicon', weight: 6, ago: 120 },
    { offer: { transporterId: 'u_jean', vehicleId: 'v1', pricingMode: 'forfait', price: 410000 }, client: 'u_sophie', from: 'Cotonou', to: 'Djougou', weight: 8, ago: 90 },
    { offer: { transporterId: 'u_jean', vehicleId: 'v1', pricingMode: 'tonne', price: 38000 }, client: 'u_sophie', from: 'Cotonou', to: 'Natitingou', weight: 7, ago: 60 },
    { offer: { transporterId: 'u_jean', vehicleId: 'v2', pricingMode: 'forfait', price: 280000 }, client: 'u_sophie', from: 'Lokossa', to: 'Cotonou', weight: 9, ago: 30 },
    { offer: { transporterId: 'u_marius', vehicleId: 'v3', pricingMode: 'tonne', price: 17000 }, client: 'u_koffi', from: 'Bohicon', to: 'Cotonou', weight: 10, ago: 20 },
  ]
  history.forEach((h, i) => {
    const oid = 'oh' + i, rid = 'rh' + i
    db.offers.push(offer({ id: oid, from: h.from, to: h.to, date: day(-h.ago), totalCapacityT: 12, availableT: 0, status: 'terminee', createdAt: iso(-h.ago - 6), ...(h.offer as Partial<Offer>), transporterId: h.offer.transporterId!, vehicleId: h.offer.vehicleId!, pricingMode: h.offer.pricingMode!, price: h.offer.price! }))
    db.requests.push(req({ id: rid, clientId: h.client, from: h.from, to: h.to, date: day(-h.ago), goods: 'alimentaires', weightT: h.weight, description: 'Marchandises', contact: phoneOf(h.client), createdAt: iso(-h.ago - 7) }))
    const ids = [rid]
    if (i === 2) { // transport mutualisé : deux clients se partagent le forfait
      db.requests.find((r) => r.id === rid)!.weightT = 4
      db.requests.push(req({ id: rid + 'b', clientId: 'u_koffi', from: h.from, to: h.to, date: day(-h.ago), goods: 'alimentaires', weightT: 4, description: 'Marchandises', contact: phoneOf('u_koffi'), createdAt: iso(-h.ago - 7) }))
      ids.push(rid + 'b')
    }
    operation({ offerId: oid, reqIds: ids, status: 'terminee', daysAgo: h.ago, paid: true, reviews: true })
  })

  // Sophie : transport confirmé (paiement à effectuer) et expédition en cours avec positions
  db.requests.push(req({ id: 'r_s3', clientId: 'u_sophie', from: 'Porto-Novo', to: 'Cotonou', date: day(12), goods: 'equipements', weightT: 1, description: '1 conteneur 20 pieds — équipements', contact: phoneOf('u_sophie'), createdAt: iso(-2) }))
  db.offers[db.offers.findIndex((o) => o.id === 'o7')].availableT = 10
  operation({ offerId: 'o7', reqIds: ['r_s3'], status: 'confirmee', daysAgo: 1, paid: false })

  db.offers.push(offer({ id: 'o_run', transporterId: 'u_jean', vehicleId: 'v1', from: 'Cotonou', to: 'Parakou', date: day(-1), totalCapacityT: 12, availableT: 2, pricingMode: 'tonne', price: 34000 }))
  db.requests.push(req({ id: 'r_s4', clientId: 'u_sophie', from: 'Cotonou', to: 'Parakou', date: day(-1), goods: 'alimentaires', weightT: 3, description: 'Produits alimentaires', contact: phoneOf('u_sophie'), createdAt: iso(-5) }))
  operation({
    offerId: 'o_run', reqIds: ['r_s4'], status: 'en_cours', daysAgo: 1, paid: true,
    events: [
      { id: uid('e'), transportId: '', at: iso(-0.6), kind: 'position', label: 'Passage à Allada', lat: 6.665, lng: 2.1514 },
      { id: uid('e'), transportId: '', at: iso(-0.3), kind: 'position', label: 'Passage à Bohicon', lat: 7.1783, lng: 2.0667 },
    ],
  })

  // Réservations en attente pour la démonstration de la mutualisation (exemple CDC §29)
  ;['r_koffi', 'r_mireille', 'r_gilbert'].forEach((id) => {
    const r = db.requests.find((x) => x.id === id)!
    db.reservations.push({ id: uid('rs'), requestId: id, offerId: 'o3', clientId: r.clientId, transporterId: 'u_jean', weightT: r.weightT, status: 'en_attente', createdAt: iso(-1) })
  })

  db.notifications.push(
    { id: uid('n'), userId: 'u_sophie', title: 'Nouvelle correspondance', body: '1 transport correspond à votre demande Cotonou → Natitingou.', link: '/client/demandes/r_s1', read: false, createdAt: iso(-0.2) },
    { id: uid('n'), userId: 'u_sophie', title: 'Mutualisation confirmée', body: 'Votre transport Porto-Novo → Cotonou est confirmé.', link: '/client/paiements', read: false, createdAt: iso(-1) },
    { id: uid('n'), userId: 'u_admin', title: 'Mutualisation possible', body: '3 demandes compatibles avec Lokossa → Cotonou.', link: '/admin/mutualisations', read: false, createdAt: iso(-0.5) },
    { id: uid('n'), userId: 'u_admin', title: 'Nouveau transporteur à valider', body: 'Nord Fret (Parakou)', link: '/admin/transporteurs', read: false, createdAt: iso(-2) },
    { id: uid('n'), userId: 'u_jean', title: 'Nouvelle demande de réservation', body: '2 t Lokossa → Cotonou', link: '/transporteur/demandes', read: false, createdAt: iso(-0.4) },
  )
  return db
}
