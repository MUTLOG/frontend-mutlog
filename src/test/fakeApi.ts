import { vi } from 'vitest'
import { setApiUser, setToken, type ApiUser } from '@/services/api'

/**
 * Fausse API Laravel pour les tests : les réponses ont EXACTEMENT le format des « Resources » du backend
 * (clés en snake_case, listes paginées { data, meta }), ce qui teste aussi la conversion camelCase du client.
 * Une route non simulée renvoie une erreur 404 bien visible dans la page.
 */
export interface Call { method: string; path: string; query: URLSearchParams; body: Record<string, unknown> }

const FUTURE = '2099-01-15'
const NOW = '2026-10-17T09:00:00+00:00'

const brief = (id: number, name: string, role = 'transporteur') => ({
  id, display_name: name, first_name: name.split(' ')[0], city: 'Cotonou', role, verified: role === 'transporteur', rating: { avg: 4.5, count: 2 },
})
const carrierBrief = brief(21, 'Transports Dossou')
const clientBrief = brief(11, 'Sophie Adjovi', 'client')

const offer = (id: number, from: string, to: string) => ({
  id, from, to, date: FUTURE, total_capacity_t: 10, available_t: 4, goods_accepted: ['agricoles', 'generales'], pricing_mode: 'forfait', price: 200000,
  notes: null, status: 'ouverte', transporter: carrierBrief, vehicle: { type: 'Camion 12 tonnes', capacity_t: 12 }, created_at: NOW,
})
const offer1 = offer(1, 'Cotonou', 'Natitingou')
const offer2 = offer(2, 'Lokossa', 'Cotonou')

const request = (id: number, status = 'recherche') => ({
  id, from: 'Lokossa', to: 'Cotonou', date: FUTURE, goods: 'agricoles', weight_t: 1, volume_m3: null, parcels: 20, description: '20 sacs de maïs',
  requirements: 'À garder au sec', attachments: [], contact: '+2290100000011', status, pooling_id: null, client: clientBrief, created_at: NOW,
})
const request31 = request(31)

const finance = { gross: 200000, rate_pct: 10, commission: 20000, net_carrier: 180000, bearer: 'transporteur' }
const share = { request_id: 31, client_id: 11, weight_t: 1, amount: 50000, payable: 50000, client_name: 'Sophie' }
const payment = { id: 51, transport_id: 41, request_id: 31, client_id: 11, amount: 50000, method: 'mobile_money', status: 'en_attente', reference: null, receipt_no: null, confirmed_at: null, created_at: NOW, transport_ref: 'MUT-2026-000001', client_name: 'Sophie' }
const transport = {
  id: 41, ref: 'MUT-2026-000001', status: 'en_cours', pooling_id: 61, offer: offer1, created_at: NOW,
  events: [{ id: 1, kind: 'statut', label: 'Transport confirmé', lat: null, lng: null, at: NOW }, { id: 2, kind: 'position', label: 'Passage à Bohicon', lat: 7.18, lng: 2.07, at: NOW }],
  share: { request_id: 31, weight_t: 1, amount: 50000, payable: 50000 }, payment, carrier_phone: '+2290100000021',
  finance, clients: [{ client_id: 11, request_id: 31, weight_t: 1, amount: 50000, payable: 50000, name: 'Sophie', phone: '+2290100000011' }], payments: [payment],
}
const pooling = (status: string) => ({ id: 61, offer_id: 1, status, transport_id: null, finance, shares: [share], offer: offer1, created_at: NOW })
const reservation = { id: 71, request_id: 31, offer_id: 1, client_id: 11, transporter_id: 21, weight_t: 1, status: 'en_attente', offer: offer1, request: request31, created_at: NOW }
const vehicle = { id: 81, owner_id: 21, type: 'Camion 12 tonnes', brand: 'Mercedes', plate: 'AB-1234-RB', capacity_t: 12, volume_m3: 40, goods_accepted: ['generales'], available: true, active: true }
const review = { id: 91, transport_id: 41, from_id: 11, to_id: 21, rating: 5, comment: 'Très ponctuel', reported: false, author: clientBrief, target: carrierBrief, created_at: NOW }
const user = (id: number, role: string, first: string, last: string, status = 'actif') => ({
  id, role, user_type: role === 'client' ? 'producteur' : role === 'admin' ? 'admin' : 'transporteur_independant', first_name: first, last_name: last, company: null,
  display_name: `${first} ${last}`, phone: `+22901000000${id}`, email: null, address: 'Cotonou', city: 'Cotonou', id_number: null, documents: [], status,
  verified: role === 'transporteur' && status === 'actif', rating: null, created_at: NOW,
})
const paged = <T,>(rows: T[]) => ({ data: rows, meta: { current_page: 1, last_page: 1, total: rows.length } })
const settings = { commission_pct: 10, commission_bearer: 'transporteur', share_basis: 'poids', city_radius_km: 30, date_tolerance_days: 2, payment_instructions: 'Payez par Mobile Money puis saisissez la référence.' }
const matchItem = { offer: offer1, score: 100, compatible: true, criteria: [{ key: 'origine', label: 'Départ compatible', ok: true, ratio: 1 }] }

export const USERS: Record<'client' | 'transporteur' | 'admin', ApiUser> = {
  client: { id: 11, role: 'client', userType: 'producteur', firstName: 'Sophie', lastName: 'Adjovi', phone: '+2290100000011', address: 'Lokossa', city: 'Lokossa', status: 'actif', documents: [] },
  transporteur: { id: 21, role: 'transporteur', userType: 'transporteur_independant', firstName: 'Koffi', lastName: 'Dossou', phone: '+2290100000021', address: 'Cotonou', city: 'Cotonou', status: 'actif', documents: [] },
  admin: { id: 1, role: 'admin', userType: 'admin', firstName: 'Admin', lastName: 'MUTLOG', phone: '+2290100000001', address: 'Cotonou', city: 'Cotonou', status: 'actif', documents: [] },
}

export interface FakeState {
  contactMessages: Array<Record<string, unknown>>
  notifications: Array<Record<string, unknown>>
  calls: Call[]
  /** Surcharge ponctuelle : renvoie une réponse pour « METHODE /chemin » (null = ne rien surcharger). */
  override?: (call: Call) => unknown | undefined
}
export const newState = (): FakeState => ({ contactMessages: [], notifications: [], calls: [] })

function respond(call: Call, st: FakeState): unknown | undefined {
  const { method, path, query } = call
  const key = `${method} ${path}`
  const is = (re: RegExp) => re.test(key)
  const id = Number(path.match(/\/(\d+)(?:\/|$)/)?.[1])

  // --- authentification
  if (key === 'POST /auth/login') return call.body.password === 'bon-mot-de-passe' ? { user: USERS.client, token: 'jeton' } : { __status: 422, message: 'Identifiants incorrects.' }
  if (key === 'POST /auth/logout') return {}
  if (key === 'GET /me') return { data: USERS.client }
  // --- public
  if (key === 'GET /cities') return { data: [{ name: 'Cotonou', lat: 6.37, lng: 2.39 }] }
  if (key === 'GET /settings/public') return { data: settings }
  if (key === 'GET /offers') return { data: [offer1, offer2], meta: { count: 2 } }
  if (is(/^GET \/offers\/\d+$/)) return { data: id === 2 ? offer2 : offer1 }
  if (key === 'POST /contact-messages') {
    const row = { id: st.contactMessages.length + 7, name: call.body.name, phone: call.body.phone ?? null, message: call.body.message, status: 'nouveau', created_at: NOW }
    st.contactMessages.push(row)
    st.notifications.push({ id: 1, title: 'Nouveau message de contact', body: `${row.name} : ${String(row.message).slice(0, 40)}`, link: `/admin/messages-contact?message=${row.id}`, read: false, created_at: NOW })
    return { data: { id: row.id, name: row.name, phone: row.phone, message: row.message, status: 'nouveau', created_at: NOW } }
  }
  // --- commun
  if (key === 'GET /notifications') return { data: st.notifications }
  if (key === 'POST /notifications/read-all' || is(/^POST \/notifications\/\d+\/read$/)) { st.notifications.forEach((n) => { if (!id || n.id === id) n.read = true }); return {} }
  if (key === 'GET /messages') return query.get('with') ? { data: [{ id: 1, from_id: 21, to_id: 11, text: 'Bonjour, le camion part demain.', created_at: NOW }] } : { data: [{ id: 21, display_name: 'Transports Dossou', role: 'transporteur' }] }
  if (key === 'POST /messages') return { data: { id: 2, from_id: 11, to_id: 21, text: call.body.text, created_at: NOW } }
  if (key === 'GET /payments') return paged([{ ...payment, reference: 'MM999' }, { ...payment, id: 52, status: 'confirme', reference: 'MM123', receipt_no: 'REC-001', confirmed_at: NOW }])
  if (key === 'GET /reviews') return { data: [review] }
  if (is(/^GET \/transports\/\d+$/)) return { data: transport }
  if (is(/^PUT \/transports\/\d+\/status$/) || is(/^POST \/transports\/\d+\/positions$/) || is(/^POST \/transports\/\d+\/reviews$/) || is(/^POST \/reviews\/\d+\/report$/)) return { data: transport }
  if (key === 'PUT /me' || key === 'PUT /me/documents') return { data: USERS.client }
  if (key === 'PUT /me/password') return {}
  // --- client
  if (key === 'GET /client/requests') return paged([request31, request(32, 'confirmee')])
  if (key === 'POST /client/requests') return { data: request(33) }
  if (is(/^GET \/client\/requests\/\d+$/)) return { data: { ...request31, matches: [matchItem], reservations: [reservation], share: null, transport_id: null } }
  if (is(/^POST \/client\/requests\/\d+\/cancel$/)) return { data: request(31, 'annule') }
  if (key === 'GET /client/reservations') return paged([reservation])
  if (key === 'POST /client/reservations') return { data: reservation }
  if (key === 'GET /client/shipments') return paged([transport])
  if (is(/^PUT \/client\/payments\/\d+\/declare$/)) return { data: { ...payment, reference: call.body.reference } }
  if (is(/^POST \/client\/transports\/\d+\/confirm-receipt$/)) return { data: transport }
  // --- transporteur
  if (key === 'GET /carrier/offers') return { data: [offer1, offer2] }
  if (key === 'POST /carrier/offers') return { data: offer(3, String(call.body.from), String(call.body.to)) }
  if (is(/^GET \/carrier\/offers\/\d+$/)) return { data: { ...offer1, compatible_requests: 1, reservations: [reservation] } }
  if (is(/^POST \/carrier\/offers\/\d+\/cancel$/)) return { data: { ...offer1, status: 'annulee' } }
  if (key === 'GET /carrier/vehicles') return { data: [vehicle] }
  if (key === 'POST /carrier/vehicles' || is(/^PUT \/carrier\/vehicles\/\d+$/)) return { data: vehicle }
  if (key === 'GET /carrier/reservations') return paged([reservation])
  if (key === 'GET /carrier/poolings') return paged([pooling('validee')])
  if (is(/^GET \/carrier\/poolings\/\d+$/)) return { data: { ...pooling('validee'), goods: [{ client_name: 'Sophie', goods: 'agricoles', weight_t: 1, parcels: 20, description: '20 sacs de maïs', requirements: 'À garder au sec', phone: null }] } }
  if (is(/^POST \/carrier\/poolings\/\d+\/respond$/)) return { data: { accepted: call.body.accept, transport_ref: 'MUT-2026-000002' } }
  if (key === 'GET /carrier/transports') return paged([transport])
  if (key === 'GET /carrier/revenue') return { data: { net_received: 180000, net_pending: 0, commission_paid: 20000, monthly: [{ month: '2026-09', net: 0 }, { month: '2026-10', net: 180000 }] } }
  if (key === 'GET /carrier/breakdowns') return { data: [] }
  // --- admin
  if (key === 'GET /admin/dashboard') return { data: { clients: 4, carriers: 3, carriers_to_validate: 1, vehicles: 5, vehicles_available: 4, requests: 6, requests_searching: 2, transports_confirmed: 1, transports_moving: 1, transports_done: 2, cancelled: 1, poolings: 3, poolings_multi: 1, transport_amount: 600000, commission_acquired: 40000, commission_planned: 20000, payments_to_review: 2, poolings_to_validate: 1, fill_rate: 62 } }
  if (key === 'GET /admin/stats') return { data: { done: 2, avg_rating: 4.5, top_routes: [{ route: 'Cotonou → Natitingou', count: 2 }], commission_by_month: { '2026-10': 40000 } } }
  if (key === 'GET /admin/users') return paged([user(21, 'transporteur', 'Koffi', 'Dossou', 'en_attente'), user(11, 'client', 'Sophie', 'Adjovi')].filter((u) => !query.get('role') || u.role === query.get('role')))
  if (is(/^GET \/admin\/users\/\d+$/)) return { data: { ...user(21, 'transporteur', 'Koffi', 'Dossou'), vehicles: [vehicle] } }
  if (is(/^(PUT|POST) \/admin\/users/)) return { data: user(21, 'transporteur', 'Koffi', 'Dossou') }
  if (key === 'GET /admin/vehicles') return paged([vehicle])
  if (key === 'GET /admin/offers') return paged([offer1, offer2])
  if (key === 'GET /admin/requests') return paged(query.get('status') === 'recherche' ? [request31] : [request31, request(32, 'confirmee')])
  if (is(/^PUT \/admin\/requests\/\d+\/status$/)) return { data: request31 }
  if (key === 'GET /admin/reservations') return paged([reservation])
  if (key === 'GET /admin/transports') return paged([transport])
  if (key === 'GET /admin/matching/offers') return { data: [{ offer: offer1, compatible_requests: 1 }] }
  if (is(/^GET \/admin\/matching\/requests\/\d+$/)) return { data: [matchItem] }
  if (key === 'GET /admin/poolings') return paged([pooling('proposee')])
  if (is(/^GET \/admin\/poolings\/candidates\/\d+$/)) return { data: { offer: offer1, candidates: [request31], suggested_ids: [31] } }
  if (key === 'POST /admin/poolings/preview') return { data: { finance, shares: [share] } }
  if (key === 'POST /admin/poolings' || is(/^PUT \/admin\/poolings\/\d+$/) || is(/^POST \/admin\/poolings\/\d+\/validate$/)) return { data: pooling('proposee') }
  if (is(/^POST \/admin\/poolings\/\d+\/refuse$/) || is(/^POST \/admin\/offers\/\d+\/cancel$/) || is(/^PUT \/admin\/payments\/\d+\/status$/) || is(/^DELETE \/admin\/reviews\/\d+$/)) return { data: {} }
  if (key === 'GET /admin/commissions') return { data: { revenue: 600000, commission_acquired: 40000, commission_planned: 20000, payments_confirmed: 300000, payments_waiting: 50000, refunded: 0, rate_pct: 10, bearer: 'transporteur', rows: [{ transport_ref: 'MUT-2026-000001', gross: 200000, rate_pct: 10, commission: 20000, net_carrier: 180000, status: 'prevue' }] } }
  if (key === 'GET /admin/settings') return { data: settings }
  if (key === 'PUT /admin/settings') return { data: { ...settings, ...(call.body as object) } }
  if (key === 'GET /admin/audit') return { data: [{ id: 1, actor: 'Admin MUTLOG', action: 'parametres_modifies', detail: 'commission 10', created_at: NOW }], current_page: 1, last_page: 1 }
  if (key === 'GET /admin/contact-messages') return { data: st.contactMessages, meta: { total: st.contactMessages.length, unread: st.contactMessages.filter((m) => m.status === 'nouveau').length } }
  if (is(/^PUT \/admin\/contact-messages\/\d+$/)) { const m = st.contactMessages.find((x) => x.id === id); if (m) m.status = String(call.body.status); return { data: m } }
  if (key === 'GET /admin/breakdowns') return { data: [] }
  return undefined
}

/** Installe la fausse API (fetch) et renvoie l'état partagé pour les assertions. */
export function installFakeApi(state: FakeState = newState()) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input))
    if (!url.pathname.startsWith('/api/v1')) throw new TypeError('network') // cartes, itinéraires… : pas de réseau en test
    const call: Call = {
      method: (init?.method ?? 'GET').toUpperCase(), path: url.pathname.replace('/api/v1', ''), query: url.searchParams,
      body: init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {},
    }
    state.calls.push(call)
    const result = (state.override?.(call) ?? respond(call, state)) as Record<string, unknown> | undefined
    const status = result === undefined ? 404 : typeof result.__status === 'number' ? result.__status : 200
    const body = result === undefined ? { message: `Route non simulée : ${call.method} ${call.path}` } : result
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
  })
  vi.stubGlobal('fetch', fetchMock)
  return state
}

/** Ouvre une session (jeton + profil) comme après une connexion réussie. */
export function signIn(role: keyof typeof USERS | null) {
  setToken(role ? 'jeton' : null)
  setApiUser(role ? USERS[role] : null)
}
