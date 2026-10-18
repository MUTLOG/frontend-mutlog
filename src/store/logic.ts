import { compatibleRequests, scoreMatch } from '@/domain/matching'
import { normalizePhone } from '@/domain/phone'
import { computeFinance, computeShares, transportTotal } from '@/domain/pricing'
import { canTransition, operationRef, STATUS_LABEL } from '@/domain/status'
import type {
  GoodsType, Offer, Payment, Pooling, PricingMode, Role, TrackingEvent, TransportRequest, User, UserType,
} from '@/domain/types'
import type { OperationStatus } from '@/types/operation'
import { fail, ok, type Db, type Result } from './db'
import { today, userName } from '@/lib/format'

// Helpers purs déplacés dans lib/format.ts ; réexportés ici le temps de la migration.
export { today, userName }

let n = 0
export const uid = (p: string) => `${p}_${Date.now().toString(36)}${(n++).toString(36)}${Math.random().toString(36).slice(2, 5)}`
export const nowIso = () => new Date().toISOString()

/** Empreinte DÉMO (non sécurisée). Le backend utilisera bcrypt/argon2 (CDC §22). */
export function demoHash(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return 'demo$' + (h >>> 0).toString(36)
}

export function notify(db: Db, userId: string, title: string, body: string, link?: string) {
  db.notifications.unshift({ id: uid('n'), userId, title, body, link, read: false, createdAt: nowIso() })
}
export function log(db: Db, actorId: string, action: string, detail: string) {
  db.audit.unshift({ id: uid('a'), actorId, action, detail, createdAt: nowIso() })
}
const admins = (db: Db) => db.users.filter((u) => u.role === 'admin')

function setRequestStatus(db: Db, requestId: string, status: OperationStatus, poolingId?: string) {
  const r = db.requests.find((x) => x.id === requestId)
  if (!r) return
  r.status = status
  if (poolingId !== undefined) r.poolingId = poolingId || undefined
}

// ───────────────────────── Authentification (CDC §7.1, §22) ─────────────────────────
export interface RegisterInput {
  role: Extract<Role, 'client' | 'transporteur'>
  userType: UserType
  firstName: string
  lastName: string
  company?: string
  phone: string
  email?: string
  address: string
  city: string
  idNumber?: string
  password: string
}

export function register(db: Db, input: RegisterInput): Result<User> {
  const phone = normalizePhone(input.phone)
  if (!phone) return fail('Numéro de téléphone invalide. Exemple : 01 97 00 00 00.')
  if (db.users.some((u) => u.phone === phone)) return fail('Un compte existe déjà avec ce numéro.')
  if (input.password.length < 8) return fail('Le mot de passe doit contenir au moins 8 caractères.')
  if (input.email && !/^\S+@\S+\.\S+$/.test(input.email)) return fail('Adresse e-mail invalide.')
  const user: User = {
    id: uid('u'), role: input.role, userType: input.userType, firstName: input.firstName.trim(), lastName: input.lastName.trim(),
    company: input.company?.trim() || undefined, phone, email: input.email?.trim() || undefined, address: input.address.trim(),
    city: input.city, idNumber: input.idNumber?.trim() || undefined, documents: [], passwordHash: demoHash(input.password),
    // Un transporteur doit être validé par l'administrateur (CDC §18).
    status: input.role === 'transporteur' ? 'en_attente' : 'actif', createdAt: nowIso(),
  }
  db.users.push(user)
  if (user.role === 'transporteur') admins(db).forEach((a) => notify(db, a.id, 'Nouveau transporteur à valider', `${userName(user)} (${user.city})`, '/admin/transporteurs'))
  log(db, user.id, 'inscription', `${user.role} ${userName(user)}`)
  return ok(user)
}

export function login(db: Db, phoneInput: string, password: string): Result<User> {
  const phone = normalizePhone(phoneInput)
  const user = phone ? db.users.find((u) => u.phone === phone) : undefined
  if (!user || user.passwordHash !== demoHash(password)) return fail('Téléphone ou mot de passe incorrect.')
  if (user.status === 'suspendu') return fail('Ce compte est suspendu. Contactez MUTLOG.')
  db.session.userId = user.id
  log(db, user.id, 'connexion', user.role)
  return ok(user)
}

export function requestReset(db: Db, phoneInput: string): Result<string> {
  const phone = normalizePhone(phoneInput)
  const user = phone ? db.users.find((u) => u.phone === phone) : undefined
  if (!phone || !user) return fail('Aucun compte avec ce numéro.')
  const code = String(Math.floor(100000 + Math.random() * 900000))
  db.resets = db.resets.filter((r) => r.phone !== phone).concat({ phone, code, expiresAt: Date.now() + 15 * 60_000 })
  return ok(code)
}

export function resetPassword(db: Db, phoneInput: string, code: string, password: string): Result {
  const phone = normalizePhone(phoneInput)
  const r = db.resets.find((x) => x.phone === phone)
  if (!r || r.code !== code || r.expiresAt < Date.now()) return fail('Code invalide ou expiré.')
  if (password.length < 8) return fail('Le mot de passe doit contenir au moins 8 caractères.')
  const user = db.users.find((u) => u.phone === phone)!
  user.passwordHash = demoHash(password)
  db.resets = db.resets.filter((x) => x !== r)
  log(db, user.id, 'mot_de_passe_reinitialise', '')
  return ok(undefined)
}

// ───────────────────────── Demandes (CDC §6 étape 2, §7.3) ─────────────────────────
export interface RequestInput {
  from: string; to: string; date: string; goods: GoodsType; weightT: number; volumeM3?: number; parcels?: number
  description: string; requirements?: string; attachments: string[]; contact: string
}

export function createRequest(db: Db, clientId: string, input: RequestInput): Result<TransportRequest> {
  if (!input.from || !input.to) return fail('Indiquez le départ et la destination.')
  if (input.from === input.to) return fail('Le départ et la destination doivent être différents.')
  if (!(input.weightT > 0)) return fail('Indiquez un poids supérieur à 0.')
  if (input.date < today()) return fail('La date souhaitée ne peut pas être dans le passé.')
  const req: TransportRequest = { ...input, id: uid('r'), clientId, status: 'recherche', createdAt: nowIso() }
  db.requests.push(req)
  const matches = db.offers.filter((o) => scoreMatch(req, o, db.settings, isActiveTransporter(db, o.transporterId)).compatible)
  if (matches.length) notify(db, clientId, 'Nouvelle correspondance', `${matches.length} transport(s) correspondent à votre demande ${req.from} → ${req.to}.`, `/client/demandes/${req.id}`)
  admins(db).forEach((a) => notify(db, a.id, 'Nouvelle demande de transport', `${req.from} → ${req.to}, ${req.weightT} t`, '/admin/demandes'))
  log(db, clientId, 'demande_creee', req.id)
  return ok(req)
}

export function isActiveTransporter(db: Db, id: string) {
  const u = db.users.find((x) => x.id === id)
  return !!u && u.status === 'actif'
}

export function cancelRequest(db: Db, actorId: string, requestId: string): Result {
  const r = db.requests.find((x) => x.id === requestId)
  if (!r) return fail('Demande introuvable.')
  const actor = db.users.find((u) => u.id === actorId)
  if (actor?.role !== 'admin' && r.clientId !== actorId) return fail('Action non autorisée.')
  if (!canTransition(r.status, 'annule')) return fail('Cette demande ne peut plus être annulée.')
  r.status = 'annule'
  db.reservations.filter((x) => x.requestId === r.id && x.status === 'en_attente').forEach((x) => {
    x.status = 'annulee'
    notify(db, x.transporterId, 'Réservation annulée', `${r.from} → ${r.to} (${r.weightT} t)`, '/transporteur/reservations')
  })
  admins(db).forEach((a) => a.id !== actorId && notify(db, a.id, 'Demande annulée', `${r.from} → ${r.to}`, '/admin/demandes'))
  if (actor?.role === 'admin') notify(db, r.clientId, 'Demande annulée', `Votre demande ${r.from} → ${r.to} a été annulée par MUTLOG.`, '/client/demandes')
  db.poolings.filter((p) => p.requestIds.includes(r.id) && ['proposee', 'validee'].includes(p.status)).forEach((p) => {
    p.status = 'annulee'
    p.requestIds.forEach((id) => id !== r.id && setRequestStatus(db, id, 'recherche', ''))
  })
  log(db, actorId, 'demande_annulee', r.id)
  return ok(undefined)
}

// ───────────────────────── Offres (CDC §9) ─────────────────────────
export interface OfferInput {
  vehicleId: string; from: string; to: string; date: string; totalCapacityT: number; availableT: number
  goodsAccepted: GoodsType[]; pricingMode: PricingMode; price: number; notes?: string
}

export function createOffer(db: Db, transporterId: string, input: OfferInput): Result<Offer> {
  const user = db.users.find((u) => u.id === transporterId)
  if (!user || user.status !== 'actif') return fail('Votre compte doit être validé par MUTLOG avant de publier un trajet.')
  const v = db.vehicles.find((x) => x.id === input.vehicleId && x.ownerId === transporterId && x.active)
  if (!v) return fail('Choisissez un de vos véhicules.')
  if (input.from === input.to) return fail('Le départ et la destination doivent être différents.')
  if (input.date < today()) return fail('La date de départ ne peut pas être dans le passé.')
  if (input.totalCapacityT > v.capacityT) return fail(`La capacité totale dépasse celle du véhicule (${v.capacityT} t).`)
  if (input.availableT <= 0 || input.availableT > input.totalCapacityT) return fail('La capacité disponible doit être comprise entre 0 et la capacité totale.')
  if (!(input.price > 0)) return fail('Indiquez un tarif.')
  const offer: Offer = { ...input, id: uid('o'), transporterId, status: 'ouverte', createdAt: nowIso() }
  db.offers.push(offer)
  const hits = compatibleRequests(offer, db.requests.filter((r) => r.status === 'recherche'), db.settings)
  hits.forEach((r) => notify(db, r.clientId, 'Nouvelle correspondance', `Un transport ${offer.from} → ${offer.to} correspond à votre demande.`, `/client/demandes/${r.id}`))
  admins(db).forEach((a) => hits.length && notify(db, a.id, 'Mutualisation possible', `${hits.length} demande(s) compatible(s) avec ${offer.from} → ${offer.to}.`, '/admin/mutualisations'))
  log(db, transporterId, 'offre_publiee', offer.id)
  return ok(offer)
}

export function cancelOffer(db: Db, actorId: string, offerId: string): Result {
  const o = db.offers.find((x) => x.id === offerId)
  if (!o) return fail('Offre introuvable.')
  const actor = db.users.find((u) => u.id === actorId)
  if (actor?.role !== 'admin' && o.transporterId !== actorId) return fail('Action non autorisée.')
  if (db.poolings.some((p) => p.offerId === o.id && p.status === 'confirmee')) return fail('Des clients ont déjà été confirmés sur ce trajet.')
  o.status = 'annulee'
  db.poolings.filter((p) => p.offerId === o.id && ['proposee', 'validee'].includes(p.status)).forEach((p) => {
    p.status = 'annulee'
    p.requestIds.forEach((id) => setRequestStatus(db, id, 'recherche', ''))
  })
  db.reservations.filter((r) => r.offerId === o.id && r.status === 'en_attente').forEach((r) => {
    r.status = 'annulee'
    notify(db, r.clientId, 'Offre annulée', `Le trajet ${o.from} → ${o.to} a été annulé.`, '/client/reservations')
  })
  return ok(undefined)
}

// ───────────────────────── Réservation (point 1 : demande en attente) ─────────────────────────
export function reserve(db: Db, clientId: string, requestId: string, offerId: string): Result {
  const r = db.requests.find((x) => x.id === requestId && x.clientId === clientId)
  const o = db.offers.find((x) => x.id === offerId)
  if (!r || !o) return fail('Demande ou transport introuvable.')
  if (o.status !== 'ouverte') return fail('Ce transport n\'est plus disponible.')
  if (!['recherche', 'demande'].includes(r.status)) return fail('Cette demande ne peut plus être réservée.')
  if (r.weightT > o.availableT) return fail(`Capacité insuffisante : ${o.availableT} t disponibles.`)
  if (db.reservations.some((x) => x.requestId === r.id && x.offerId === o.id && x.status === 'en_attente')) return fail('Réservation déjà envoyée.')
  db.reservations.push({ id: uid('rs'), requestId: r.id, offerId: o.id, clientId, transporterId: o.transporterId, weightT: r.weightT, status: 'en_attente', createdAt: nowIso() })
  notify(db, o.transporterId, 'Nouvelle demande de réservation', `${r.weightT} t ${r.from} → ${r.to}`, '/transporteur/demandes')
  admins(db).forEach((a) => notify(db, a.id, 'Réservation à regrouper', `${r.from} → ${r.to}, ${r.weightT} t`, '/admin/mutualisations'))
  log(db, clientId, 'reservation', `${r.id} → ${o.id}`)
  return ok(undefined)
}

// ───────────────────────── Mutualisation (CDC §11, §12, §13) ─────────────────────────
function buildPooling(db: Db, offer: Offer, requestIds: string[]): Result<Pick<Pooling, 'shares' | 'finance'>> {
  const reqs = requestIds.map((id) => db.requests.find((r) => r.id === id)).filter(Boolean) as TransportRequest[]
  if (!reqs.length) return fail('Sélectionnez au moins une demande.')
  const total = reqs.reduce((s, r) => s + r.weightT, 0)
  if (total > offer.availableT + 1e-9) return fail(`Capacité dépassée : ${total} t pour ${offer.availableT} t disponibles.`)
  const bad = reqs.find((r) => !scoreMatch(r, offer, db.settings).compatible)
  if (bad) return fail(`La demande ${bad.from} → ${bad.to} n'est pas compatible avec ce trajet.`)
  const gross = transportTotal(offer, total)
  const finance = computeFinance(gross, db.settings.commissionPct, db.settings.commissionBearer)
  const shares = computeShares(gross, reqs.map((r) => ({ requestId: r.id, clientId: r.clientId, weightT: r.weightT, volumeM3: r.volumeM3 })), db.settings.shareBasis, finance)
  return ok({ shares, finance })
}

export function proposePooling(db: Db, actorId: string, offerId: string, requestIds: string[]): Result<Pooling> {
  const offer = db.offers.find((o) => o.id === offerId)
  if (!offer || offer.status !== 'ouverte') return fail('Offre indisponible.')
  if (requestIds.some((id) => db.requests.find((r) => r.id === id)?.status !== 'recherche')) return fail('Une des demandes n\'est plus en recherche.')
  const built = buildPooling(db, offer, requestIds)
  if (!built.ok) return built
  const p: Pooling = { id: uid('p'), offerId, requestIds, status: 'proposee', createdAt: nowIso(), ...built.value }
  db.poolings.push(p)
  requestIds.forEach((id) => setRequestStatus(db, id, 'mutualisation', p.id))
  log(db, actorId, 'mutualisation_proposee', p.id)
  return ok(p)
}

/** Modifier un regroupement non encore validé (CDC §18 : modifier un regroupement). */
export function updatePooling(db: Db, actorId: string, poolingId: string, requestIds: string[]): Result {
  const p = db.poolings.find((x) => x.id === poolingId)
  const offer = p && db.offers.find((o) => o.id === p.offerId)
  if (!p || !offer || p.status !== 'proposee') return fail('Ce regroupement ne peut plus être modifié.')
  const built = buildPooling(db, offer, requestIds)
  if (!built.ok) return built
  p.requestIds.filter((id) => !requestIds.includes(id)).forEach((id) => setRequestStatus(db, id, 'recherche', ''))
  requestIds.forEach((id) => setRequestStatus(db, id, 'mutualisation', p.id))
  Object.assign(p, { requestIds, ...built.value })
  log(db, actorId, 'mutualisation_modifiee', p.id)
  return ok(undefined)
}

export function refusePooling(db: Db, actorId: string, poolingId: string): Result {
  const p = db.poolings.find((x) => x.id === poolingId)
  if (!p || !['proposee', 'validee'].includes(p.status)) return fail('Regroupement introuvable.')
  p.status = 'annulee'
  p.requestIds.forEach((id) => setRequestStatus(db, id, 'recherche', ''))
  log(db, actorId, 'mutualisation_refusee', p.id)
  return ok(undefined)
}

/** V1 : l'administrateur valide le regroupement avant la confirmation définitive (CDC §11). */
export function validatePooling(db: Db, adminId: string, poolingId: string): Result {
  const p = db.poolings.find((x) => x.id === poolingId)
  const offer = p && db.offers.find((o) => o.id === p.offerId)
  if (!p || !offer || p.status !== 'proposee') return fail('Regroupement introuvable ou déjà traité.')
  const rebuilt = buildPooling(db, offer, p.requestIds) // revérifie capacité et compatibilité au moment de valider
  if (!rebuilt.ok) return rebuilt
  Object.assign(p, rebuilt.value)
  p.status = 'validee'
  notify(db, offer.transporterId, 'Regroupement à confirmer', `${p.requestIds.length} demande(s) sur ${offer.from} → ${offer.to}`, '/transporteur/demandes')
  log(db, adminId, 'mutualisation_validee', p.id)
  return ok(undefined)
}

/** Le transporteur accepte ou refuse le regroupement validé (CDC §6 étape 5, §29). */
export function respondPooling(db: Db, transporterId: string, poolingId: string, accept: boolean): Result<string | undefined> {
  const p = db.poolings.find((x) => x.id === poolingId)
  const offer = p && db.offers.find((o) => o.id === p.offerId)
  if (!p || !offer || offer.transporterId !== transporterId) return fail('Action non autorisée.')
  if (p.status !== 'validee') return fail('Ce regroupement n\'attend pas votre réponse.')
  if (!accept) {
    p.status = 'refusee'
    p.requestIds.forEach((id) => setRequestStatus(db, id, 'recherche', ''))
    p.shares.forEach((s) => notify(db, s.clientId, 'Demande refusée', 'Le transporteur n\'a pas pu confirmer. Nous recherchons une autre solution.', '/client/demandes'))
    admins(db).forEach((a) => notify(db, a.id, 'Regroupement refusé', `${offer.from} → ${offer.to}`, '/admin/mutualisations'))
    return ok(undefined)
  }
  const totalW = p.shares.reduce((s, x) => s + x.weightT, 0)
  if (totalW > offer.availableT + 1e-9) return fail('Capacité disponible insuffisante.')
  db.counters.transport += 1
  const ref = operationRef(new Date().getFullYear(), db.counters.transport)
  const t = { id: uid('t'), ref, poolingId: p.id, offerId: offer.id, status: 'confirmee' as OperationStatus, events: [] as TrackingEvent[] }
  t.events.push({ id: uid('e'), transportId: t.id, at: nowIso(), kind: 'statut', label: STATUS_LABEL.confirmee })
  db.transports.push(t)
  p.status = 'confirmee'
  p.transportId = t.id
  offer.availableT = Math.round((offer.availableT - totalW) * 1000) / 1000
  if (offer.availableT <= 0) offer.status = 'complete'
  p.requestIds.forEach((id) => setRequestStatus(db, id, 'confirmee', p.id))
  db.reservations.filter((r) => r.offerId === offer.id && p.requestIds.includes(r.requestId) && r.status === 'en_attente').forEach((r) => (r.status = 'confirmee'))
  db.commissions.push({ id: uid('c'), transportId: t.id, gross: p.finance.gross, ratePct: p.finance.ratePct, commission: p.finance.commission, netCarrier: p.finance.netCarrier, status: 'prevue' })
  p.shares.forEach((s) => {
    db.payments.push({ id: uid('pay'), transportId: t.id, clientId: s.clientId, requestId: s.requestId, amount: s.payable, method: 'mobile_money', status: 'en_attente', createdAt: nowIso() })
    notify(db, s.clientId, 'Mutualisation confirmée', `Transport ${ref} confirmé. Votre participation : ${s.payable.toLocaleString('fr-FR')} FCFA.`, '/client/paiements')
  })
  admins(db).forEach((a) => notify(db, a.id, 'Transport confirmé', ref, '/admin/transports'))
  log(db, transporterId, 'mutualisation_confirmee', `${p.id} → ${ref}`)
  return ok(ref)
}

// ───────────────────────── Paiements (CDC §14, V1 : validation manuelle) ─────────────────────────
export function declarePayment(db: Db, clientId: string, paymentId: string, method: Payment['method'], reference: string): Result {
  const pay = db.payments.find((p) => p.id === paymentId && p.clientId === clientId)
  if (!pay) return fail('Paiement introuvable.')
  if (!['en_attente', 'echoue'].includes(pay.status)) return fail('Ce paiement est déjà traité.')
  if (reference.trim().length < 4) return fail('Indiquez la référence de la transaction (reçue par SMS).')
  Object.assign(pay, { method, reference: reference.trim(), status: 'en_attente' as const })
  admins(db).forEach((a) => notify(db, a.id, 'Paiement à vérifier', `Réf. ${reference.trim()} — ${pay.amount.toLocaleString('fr-FR')} FCFA`, '/admin/paiements'))
  return ok(undefined)
}

export function setPaymentStatus(db: Db, adminId: string, paymentId: string, status: Payment['status']): Result {
  const pay = db.payments.find((p) => p.id === paymentId)
  if (!pay) return fail('Paiement introuvable.')
  if (status === 'rembourse' && pay.status !== 'confirme') return fail('Seul un paiement confirmé peut être remboursé.')
  if (status === 'confirme' && !pay.reference) return fail('Aucune référence de transaction déclarée par le client.')
  pay.status = status
  if (status === 'confirme') {
    db.counters.receipt += 1
    pay.confirmedAt = nowIso()
    pay.receiptNo = `REC-${new Date().getFullYear()}-${String(db.counters.receipt).padStart(6, '0')}`
    notify(db, pay.clientId, 'Paiement confirmé', `Reçu ${pay.receiptNo}`, '/client/paiements')
  } else if (status === 'echoue') notify(db, pay.clientId, 'Paiement échoué', 'Vérifiez la référence ou réessayez.', '/client/paiements')
  else if (status === 'rembourse') notify(db, pay.clientId, 'Paiement remboursé', pay.receiptNo ?? '', '/client/paiements')
  log(db, adminId, 'paiement_' + status, pay.id)
  return ok(undefined)
}

// ───────────────────────── Suivi du transport (CDC §15) ─────────────────────────
export function advanceTransport(db: Db, actorId: string, transportId: string, to: OperationStatus, position?: { lat: number; lng: number }): Result {
  const t = db.transports.find((x) => x.id === transportId)
  const p = t && db.poolings.find((x) => x.id === t.poolingId)
  const offer = t && db.offers.find((o) => o.id === t.offerId)
  const actor = db.users.find((u) => u.id === actorId)
  if (!t || !p || !offer || !actor) return fail('Transport introuvable.')
  const isOwner = offer.transporterId === actorId
  const isClient = p.shares.some((s) => s.clientId === actorId)
  const allowed =
    actor.role === 'admin' ||
    (isOwner && ['en_cours', 'arrive_destination', 'livree', 'annule'].includes(to)) ||
    (isClient && to === 'terminee')
  if (!allowed) return fail('Action non autorisée.')
  if (!canTransition(t.status, to)) return fail('Changement de statut impossible depuis « ' + STATUS_LABEL[t.status] + ' ».')
  t.status = to
  t.events.push({ id: uid('e'), transportId: t.id, at: nowIso(), kind: 'statut', label: STATUS_LABEL[to], ...position })
  p.requestIds.forEach((id) => setRequestStatus(db, id, to))
  const msg: Partial<Record<OperationStatus, string>> = {
    en_cours: 'Le véhicule est parti.', arrive_destination: 'Le véhicule est arrivé à destination.',
    livree: 'Votre marchandise est livrée. Confirmez la réception et évaluez le transporteur.', terminee: 'Opération terminée.', annule: 'Le transport a été annulé.',
  }
  p.shares.forEach((s) => notify(db, s.clientId, `${t.ref} — ${STATUS_LABEL[to]}`, msg[to] ?? '', `/client/expeditions/${t.id}`))
  if (to === 'terminee') {
    const c = db.commissions.find((x) => x.transportId === t.id)
    if (c) c.status = 'acquise' // commission enregistrée automatiquement (CDC §29)
    offer.status = offer.availableT > 0 && offer.status !== 'complete' ? offer.status : 'terminee'
  }
  if (to === 'annule') {
    const c = db.commissions.find((x) => x.transportId === t.id)
    if (c) c.status = 'annulee'
    db.payments.filter((x) => x.transportId === t.id && x.status === 'en_attente').forEach((x) => (x.status = 'echoue'))
    admins(db).forEach((a) => notify(db, a.id, 'Transport annulé', `${t.ref} — vérifier les remboursements`, '/admin/paiements'))
  }
  log(db, actorId, 'transport_' + to, t.ref)
  return ok(undefined)
}

export function addPosition(db: Db, actorId: string, transportId: string, lat: number, lng: number, label: string): Result {
  const t = db.transports.find((x) => x.id === transportId)
  const offer = t && db.offers.find((o) => o.id === t.offerId)
  if (!t || !offer || (offer.transporterId !== actorId && db.users.find((u) => u.id === actorId)?.role !== 'admin')) return fail('Action non autorisée.')
  if (t.status !== 'en_cours') return fail('Les positions s\'enregistrent pendant que le transport est en cours.')
  t.events.push({ id: uid('e'), transportId: t.id, at: nowIso(), kind: 'position', label, lat, lng })
  return ok(undefined)
}

// ───────────────────────── Évaluations (CDC §21) ─────────────────────────
export function submitReview(db: Db, fromId: string, transportId: string, toId: string, rating: number, comment?: string): Result {
  const t = db.transports.find((x) => x.id === transportId)
  const p = t && db.poolings.find((x) => x.id === t.poolingId)
  const offer = t && db.offers.find((o) => o.id === t.offerId)
  if (!t || !p || !offer) return fail('Transport introuvable.')
  if (!['livree', 'terminee'].includes(t.status)) return fail('Vous pourrez évaluer après la livraison.')
  const participants = new Set([offer.transporterId, ...p.shares.map((s) => s.clientId)])
  if (!participants.has(fromId) || !participants.has(toId) || fromId === toId) return fail('Évaluation non autorisée.')
  const fromRole = db.users.find((u) => u.id === fromId)?.role
  const toRole = db.users.find((u) => u.id === toId)?.role
  if (fromRole === toRole) return fail('Évaluation non autorisée.')
  if (!(rating >= 1 && rating <= 5)) return fail('Choisissez une note de 1 à 5.')
  if (db.reviews.some((r) => r.transportId === t.id && r.fromId === fromId && r.toId === toId)) return fail('Vous avez déjà évalué cette opération.')
  db.reviews.push({ id: uid('rv'), transportId: t.id, fromId, toId, rating, comment: comment?.trim() || undefined, reported: false, createdAt: nowIso() })
  notify(db, toId, 'Nouvelle évaluation', `${rating}/5`, undefined)
  return ok(undefined)
}

export function reportReview(db: Db, actorId: string, reviewId: string): Result {
  const r = db.reviews.find((x) => x.id === reviewId)
  if (!r || r.toId !== actorId) return fail('Action non autorisée.')
  r.reported = true
  admins(db).forEach((a) => notify(db, a.id, 'Évaluation signalée', reviewId, '/admin/evaluations'))
  return ok(undefined)
}

export const avgRating = (db: Db, userId: string) => {
  const rs = db.reviews.filter((r) => r.toId === userId)
  return rs.length ? { avg: rs.reduce((s, r) => s + r.rating, 0) / rs.length, count: rs.length } : null
}

// ───────────────────────── Administration (CDC §18) ─────────────────────────
export function setUserStatus(db: Db, adminId: string, userId: string, status: User['status']): Result {
  const u = db.users.find((x) => x.id === userId)
  if (!u) return fail('Utilisateur introuvable.')
  if (u.id === adminId) return fail('Vous ne pouvez pas modifier votre propre compte.')
  u.status = status
  if (u.role === 'transporteur') notify(db, u.id, status === 'actif' ? 'Compte validé' : 'Compte ' + status.replace('_', ' '), status === 'actif' ? 'Vous pouvez publier vos trajets.' : 'Contactez MUTLOG.', '/transporteur/dashboard')
  log(db, adminId, 'utilisateur_' + status, u.id)
  return ok(undefined)
}

export function deleteUser(db: Db, adminId: string, userId: string): Result {
  const u = db.users.find((x) => x.id === userId)
  if (!u || u.id === adminId) return fail('Suppression impossible.')
  const used = db.requests.some((r) => r.clientId === u.id) || db.offers.some((o) => o.transporterId === u.id) || db.payments.some((p) => p.clientId === u.id)
  if (used) return fail('Ce compte a un historique d\'opérations : suspendez-le plutôt que de le supprimer.')
  db.users = db.users.filter((x) => x.id !== u.id)
  db.vehicles = db.vehicles.filter((v) => v.ownerId !== u.id)
  log(db, adminId, 'utilisateur_supprime', u.id)
  return ok(undefined)
}

export function setRequestStatusAdmin(db: Db, adminId: string, requestId: string, status: OperationStatus): Result {
  const r = db.requests.find((x) => x.id === requestId)
  if (!r) return fail('Demande introuvable.')
  if (r.poolingId && db.transports.some((t) => t.poolingId === r.poolingId)) return fail('Cette demande fait partie d\'un transport : changez le statut depuis « Transports ».')
  if (!canTransition(r.status, status)) return fail('Changement de statut impossible.')
  r.status = status
  notify(db, r.clientId, 'Mise à jour de votre demande', `${r.from} → ${r.to} : ${STATUS_LABEL[status]}`, `/client/demandes/${r.id}`)
  log(db, adminId, 'demande_statut', `${r.id} → ${status}`)
  return ok(undefined)
}

export function saveVehicle(db: Db, ownerId: string, v: Omit<import('@/domain/types').Vehicle, 'id' | 'ownerId'> & { id?: string }): Result {
  if (!v.type.trim() || !v.plate.trim()) return fail('Type de véhicule et immatriculation requis.')
  if (!(v.capacityT > 0)) return fail('Indiquez la capacité en tonnes.')
  const plate = v.plate.trim().toUpperCase()
  if (db.vehicles.some((x) => x.plate === plate && x.id !== v.id)) return fail('Cette immatriculation est déjà enregistrée.')
  if (v.id) {
    const cur = db.vehicles.find((x) => x.id === v.id)
    if (!cur) return fail('Véhicule introuvable.')
    const actor = db.users.find((u) => u.id === ownerId)
    if (cur.ownerId !== ownerId && actor?.role !== 'admin') return fail('Action non autorisée.')
    Object.assign(cur, v, { plate })
  } else db.vehicles.push({ ...v, plate, id: uid('v'), ownerId })
  return ok(undefined)
}

export function sendMessage(db: Db, fromId: string, toId: string, text: string, ctx: { transportId?: string; offerId?: string }): Result {
  if (!text.trim()) return fail('Message vide.')
  db.messages.push({ id: uid('m'), fromId, toId, text: text.trim(), createdAt: nowIso(), ...ctx })
  notify(db, toId, 'Nouveau message', text.trim().slice(0, 80), '/' + (db.users.find((u) => u.id === toId)?.role ?? 'client') + '/messages')
  return ok(undefined)
}

export interface UserPatch { firstName: string; lastName: string; company?: string; email?: string; address: string; city: string; idNumber?: string; userType: UserType }

/** Modification d'un compte par l'administrateur (CDC §18). */
export function updateUser(db: Db, adminId: string, userId: string, p: UserPatch): Result {
  const u = db.users.find((x) => x.id === userId)
  if (!u) return fail('Utilisateur introuvable.')
  if (!p.firstName.trim() || !p.lastName.trim()) return fail('Nom et prénom requis.')
  if (p.email && !/^\S+@\S+\.\S+$/.test(p.email)) return fail('Adresse e-mail invalide.')
  Object.assign(u, { firstName: p.firstName.trim(), lastName: p.lastName.trim(), company: p.company?.trim() || undefined, email: p.email?.trim() || undefined, address: p.address.trim(), city: p.city, idNumber: p.idNumber?.trim() || undefined, userType: p.userType })
  log(db, adminId, 'utilisateur_modifie', u.id)
  return ok(undefined)
}

/** Documents de l'entreprise (CDC §8.1) : V1 démonstration = noms de fichiers ; le backend stockera les fichiers. */
export function setDocuments(db: Db, userId: string, names: string[]): Result {
  const u = db.users.find((x) => x.id === userId)
  if (!u) return fail('Utilisateur introuvable.')
  u.documents = names.slice(0, 10)
  log(db, userId, 'documents_modifies', String(u.documents.length))
  if (u.role === 'transporteur') admins(db).forEach((a) => notify(db, a.id, 'Documents transporteur mis à jour', userName(u), '/admin/transporteurs'))
  return ok(undefined)
}
