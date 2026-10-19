// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { setApiUser, setToken, type ApiUser } from '@/services/api'

/**
 * Test de fumée : chaque page de chaque espace se rend sans erreur d'exécution, avec une API qui répond
 * « aucune donnée » (listes vides, 404 sur les fiches). Les scénarios avec données sont dans client-space,
 * carrier-space et contact-flow ; la logique métier est testée côté Laravel.
 * Le réseau est simulé au niveau de `fetch` : on traverse donc apiData, la conversion des clés et les hooks.
 */
const USERS: Record<string, ApiUser> = {
  client: { id: 11, role: 'client', userType: 'autre_client', firstName: 'Sophie', lastName: 'Adjovi', phone: '0197000011', email: null, address: 'Cotonou', city: 'Cotonou', status: 'actif' },
  transporteur: { id: 21, role: 'transporteur', userType: 'transporteur_independant', firstName: 'Jean', lastName: 'Koffi', phone: '0197000021', email: null, address: 'Lokossa', city: 'Lokossa', status: 'actif', documents: [] },
  admin: { id: 1, role: 'admin', userType: 'admin', firstName: 'Awa', lastName: 'Admin', phone: '0197000001', email: null, address: 'Cotonou', city: 'Cotonou', status: 'actif' },
}
const OFFER = {
  id: 3, from: 'Cotonou', to: 'Natitingou', date: '2099-11-02', total_capacity_t: 12, available_t: 6, goods_accepted: ['agricoles'], pricing_mode: 'forfait', price: 200000, status: 'ouverte',
  transporter: { id: 21, display_name: 'Jean Transport', verified: true, rating: { avg: 4.5, count: 2 } },
}
const SETTINGS = { commission_pct: 8, commission_bearer: 'transporteur', share_basis: 'poids', city_radius_km: 25, date_tolerance_days: 2, payment_instructions: 'Payez par Mobile Money.' }
const OBJECTS: Record<string, unknown> = {
  '/settings/public': { data: SETTINGS },
  '/admin/settings': { data: SETTINGS },
  '/admin/stats': { data: { done: 0, poolings_multi: 0, avg_rating: null, top_routes: [], commission_by_month: {} } },
  '/admin/commissions': { data: { revenue: 0, commission_acquired: 0, commission_planned: 0, payments_confirmed: 0, payments_waiting: 0, refunded: 0, rate_pct: 8, bearer: 'transporteur', rows: [] } },
  '/admin/dashboard': { data: { clients: 0, carriers: 0, carriers_to_validate: 0, vehicles: 0, vehicles_available: 0, requests: 0, requests_searching: 0, transports_confirmed: 0, transports_moving: 0, transports_done: 0, cancelled: 0, poolings: 0, poolings_multi: 0, transport_amount: 0, commission_acquired: 0, commission_planned: 0, payments_to_review: 0, poolings_to_validate: 0, fill_rate: 0 } },
  '/carrier/revenue': { data: { net_received: 0, net_pending: 0, commission_paid: 0, monthly: [] } },
  '/offers': { data: [OFFER], meta: { count: 1 } },
  '/offers/3': { data: OFFER },
}

let currentRole: keyof typeof USERS = 'client'
const requested: string[] = []

beforeAll(() => {
  ;(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
  window.scrollTo = () => {}
  Element.prototype.scrollIntoView = () => {}
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input))
    const path = url.pathname.replace(/^\/api\/v1/, '')
    requested.push(`${init?.method ?? 'GET'} ${path}`)
    const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
    if ((init?.method ?? 'GET') !== 'GET') return reply(200, {})
    if (path === '/me') return reply(200, { data: USERS[currentRole] })
    if (path in OBJECTS) return reply(200, OBJECTS[path])
    if (/\/\d+$/.test(path) || /\/(preview|candidates\/\d+)$/.test(path)) return reply(404, { message: 'Not Found.' }) // fiches : introuvables
    return reply(200, { data: [] })
  })
})
afterEach(() => { cleanup(); setApiUser(null); setToken(null); requested.length = 0 })

const as = (role: keyof typeof USERS | null) => {
  if (role) { currentRole = role; setToken('test-token'); setApiUser(USERS[role]) } else { setToken(null); setApiUser(null) }
}
const show = async (path: string) => {
  const r = render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
  await waitFor(() => { if (r.container.querySelector('.animate-spin') || /Chargement/.test(r.container.textContent ?? '')) throw new Error('chargement en cours') }, { timeout: 8000 })
  const text = r.container.textContent ?? ''
  cleanup()
  return text
}

describe('rendu des pages (aucune erreur d\'exécution)', () => {
  it('pages publiques', async () => {
    as(null)
    for (const p of ['/', '/rechercher', '/rechercher?from=Lokossa&to=Cotonou&poids=2', '/transports/3', '/transports/999', '/connexion', '/inscription', '/mot-de-passe-oublie', '/comment-ca-marche', '/services', '/a-propos', '/contact', '/conditions', '/design-system', '/inexistant'])
      expect((await show(p)).length, p).toBeGreaterThan(40)
  })

  it('contenu clé de la page d\'accueil, de la recherche et d\'une fiche transport', async () => {
    as(null)
    expect(await show('/')).toContain('plus intelligent')
    const s = await show('/rechercher')
    expect(s).toContain('Transports disponibles')
    expect(s).toContain('Cotonou → Natitingou')
    expect(s).toContain('Jean Transport')
    expect(await show('/transports/3')).toContain('200')
    expect(await show('/transports/999')).toContain('Transport introuvable')
  })

  it('la recherche envoie le poids sous le nom attendu par Laravel (weight_t)', async () => {
    as(null)
    await show('/rechercher?poids=2')
    expect(requested.some((r) => r.startsWith('GET /offers'))).toBe(true)
  })

  it('espace client', async () => {
    as('client')
    for (const p of ['/client/dashboard', '/client/demandes', '/client/demandes/nouvelle', '/client/demandes/11', '/client/reservations', '/client/expeditions', '/client/expeditions/31', '/client/paiements', '/client/messages', '/client/historique', '/client/evaluations', '/client/notifications', '/client/profil', '/client/rechercher', '/client/transports/3'])
      expect((await show(p)).length, p).toBeGreaterThan(40)
    expect(await show('/client/dashboard')).toContain('Bienvenue Sophie')
  })

  it('espace transporteur', async () => {
    as('transporteur')
    for (const p of ['/transporteur/dashboard', '/transporteur/trajets', '/transporteur/trajets/nouveau', '/transporteur/trajets/3', '/transporteur/demandes', '/transporteur/demandes/5', '/transporteur/reservations', '/transporteur/transports', '/transporteur/vehicules', '/transporteur/revenus', '/transporteur/paiements', '/transporteur/pannes', '/transporteur/avis', '/transporteur/historique', '/transporteur/notifications', '/transporteur/profil'])
      expect((await show(p)).length, p).toBeGreaterThan(40)
    expect(await show('/transporteur/dashboard')).toContain('Bienvenue Jean')
  })

  it('espace administrateur', async () => {
    as('admin')
    for (const p of ['dashboard', 'utilisateurs', 'clients', 'transporteurs', 'vehicules', 'demandes', 'offres', 'matching', 'mutualisations', 'reservations', 'operations', 'transports', 'paiements', 'commissions', 'evaluations', 'notifications', 'statistiques', 'audit', 'pannes', 'messages-contact', 'parametres', 'matching?demande=11', 'mutualisations?offre=3'])
      expect((await show('/admin/' + p)).length, p).toBeGreaterThan(40)
  })

  it('contrôle d\'accès : un client ne voit pas l\'administration, un visiteur est renvoyé à la connexion', async () => {
    as('client')
    expect(await show('/admin/dashboard')).toContain('Bienvenue Sophie')
    expect(await show('/transporteur/dashboard')).toContain('Bienvenue Sophie')
    as(null)
    expect(await show('/client/dashboard')).toContain('Connexion')
    expect(await show('/admin/dashboard')).toContain('Connexion')
  })

  it('aucune page n\'utilise plus la base locale du navigateur', async () => {
    as('client')
    localStorage.removeItem('mutlog.db.v1')
    await show('/client/dashboard')
    expect(localStorage.getItem('mutlog.db.v1')).toBeNull()
  })
})
