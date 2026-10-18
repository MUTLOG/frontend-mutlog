// @vitest-environment jsdom
import { describe, expect, it, beforeAll, vi } from 'vitest'
import { render, cleanup, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { run, resetDemo } from './store/store'
import * as L from './store/logic'

// L'espace client lit désormais l'API : ici elle répond « aucune donnée » (le détail avec données est testé
// dans client-space.test.tsx). Les autres espaces sont encore sur la base locale et ne passent pas par ces appels.
vi.mock('@/services/mutlogApi', async (orig) => {
  const real = await orig<typeof import('@/services/mutlogApi')>()
  const none = async () => []
  return {
    ...real,
    clientApi: {
      ...real.clientApi, requests: none, reservations: none, shipments: none,
      request: async () => { throw new Error('Demande introuvable.') }, shipment: async () => { throw new Error('Expédition introuvable.') },
    },
    sharedApi: { ...real.sharedApi, reviews: none },
    publicApi: { ...real.publicApi, settings: async () => real.EMPTY_PUBLIC_SETTINGS },
  }
})

beforeAll(() => {
  ;(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
  window.scrollTo = () => {}
  Element.prototype.scrollIntoView = () => {}
})

const as = (phone: string | null) => { resetDemo(); if (phone) run((d) => L.login(d, phone, 'MutlogDemo1')) }
const show = async (path: string) => {
  const r = render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
  await waitFor(() => { if (r.container.querySelector('.animate-spin')) throw new Error('chargement en cours') }, { timeout: 8000 })
  const text = r.container.textContent ?? ''
  cleanup()
  return text
}

describe('rendu des pages (aucune erreur d\'exécution)', () => {
  it('pages publiques', async () => {
    as(null)
    for (const p of ['/', '/rechercher', '/rechercher?from=Lokossa&to=Cotonou', '/transports/o3', '/connexion', '/inscription', '/mot-de-passe-oublie', '/comment-ca-marche', '/services', '/a-propos', '/contact', '/conditions', '/design-system', '/inexistant'])
      expect((await show(p)).length, p).toBeGreaterThan(40)
  })
  it('contenu clé de la page d\'accueil et de la recherche', async () => {
    as(null)
    expect(await show('/')).toContain('plus intelligent')
    const s = await show('/rechercher')
    expect(s).toContain('Transports disponibles')
    expect(s).toContain('Cotonou → Natitingou')
    expect(await show('/transports/o3')).toContain('200')
  })
  it('espace client', async () => {
    as('0100000011')
    for (const p of ['/client/dashboard', '/client/demandes', '/client/demandes/nouvelle', '/client/demandes/r_s1', '/client/reservations', '/client/expeditions', '/client/paiements', '/client/messages', '/client/historique', '/client/evaluations', '/client/notifications', '/client/profil', '/client/rechercher', '/client/transports/o1'])
      expect((await show(p)).length, p).toBeGreaterThan(40)
    expect(await show('/client/dashboard')).toContain('Bienvenue Sophie')
  })
  it('espace transporteur', async () => {
    as('0100000021')
    for (const p of ['/transporteur/dashboard', '/transporteur/trajets', '/transporteur/trajets/nouveau', '/transporteur/trajets/o1', '/transporteur/demandes', '/transporteur/reservations', '/transporteur/transports', '/transporteur/vehicules', '/transporteur/revenus', '/transporteur/paiements', '/transporteur/avis', '/transporteur/historique', '/transporteur/notifications', '/transporteur/profil'])
      expect((await show(p)).length, p).toBeGreaterThan(40)
  })
  it('espace administrateur', async () => {
    as('0100000001')
    for (const p of ['dashboard', 'utilisateurs', 'clients', 'transporteurs', 'vehicules', 'demandes', 'offres', 'matching', 'mutualisations', 'reservations', 'operations', 'transports', 'paiements', 'commissions', 'evaluations', 'notifications', 'statistiques', 'audit', 'parametres', 'matching?demande=r_koffi', 'mutualisations?offre=o3'])
      expect((await show('/admin/' + p)).length, p).toBeGreaterThan(40)
  })
  it('contrôle d\'accès : un client ne voit pas l\'administration', async () => {
    as('0100000011')
    expect(await show('/admin/dashboard')).toContain('Bienvenue Sophie')
    as(null)
    expect(await show('/client/dashboard')).toContain('Connexion')
  })

  it('écrans de mutualisation : maquette « Mutualisation » et « Correspondance trouvée »', async () => {
    as('0100000001')
    const t = await show('/admin/mutualisations?offre=o3')
    expect(t).toContain('Taux de remplissage')
    expect(t).toContain('Prix transport')
    expect(t).toContain('Créer le regroupement')
    expect(await show('/admin/matching')).toContain('Matching MUTLOG')
    const db = JSON.parse(localStorage.getItem('mutlog.db.v1')!)
    expect(db.offers.length).toBeGreaterThan(5)
  })
  it('demande reçue côté transporteur : détails et boutons Accepter / Refuser', async () => {
    as('0100000001')
    run((d) => L.proposePooling(d, 'u_admin', 'o3', ['r_koffi', 'r_mireille', 'r_gilbert']))
    const id = JSON.parse(localStorage.getItem('mutlog.db.v1')!).poolings.find((p: { status: string }) => p.status === 'proposee').id
    run((d) => L.validatePooling(d, 'u_admin', id))
    run((d) => L.login(d, '0100000021', 'MutlogDemo1'))
    const list = await show('/transporteur/demandes')
    expect(list).toContain('Accepter')
    expect(list).toContain('Refuser')
    expect(await show('/transporteur/demandes/' + id)).toContain('Marchandises')
  })
})
