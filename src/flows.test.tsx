// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { installFakeApi, newState, signIn, type Call, type FakeState } from './test/fakeApi'

let state: FakeState
const open = (path: string) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
const sent = (method: string, path: RegExp | string) => state.calls.find((c) => c.method === method && (typeof path === 'string' ? c.path === path : path.test(c.path))) as Call | undefined
// DataTable affiche une version mobile et une version bureau : on clique le premier bouton trouvé.
const click = async (name: RegExp | string) => fireEvent.click((await screen.findAllByRole('button', { name }))[0])

beforeAll(() => {
  ;(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
  window.scrollTo = () => {}
  Element.prototype.scrollIntoView = () => {}
})
beforeEach(() => { state = installFakeApi(newState()); localStorage.clear() })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('contact : du visiteur à l’administrateur', () => {
  it('le visiteur envoie son message, l’admin le lit depuis la notification', async () => {
    signIn(null)
    open('/contact')
    fireEvent.change(await screen.findByLabelText(/Nom complet/), { target: { value: 'Awa K.' } })
    fireEvent.change(screen.getByLabelText(/Votre message/), { target: { value: 'Bonjour, comment réserver un camion pour Cotonou ?' } })
    await click(/Envoyer le message/)
    expect(await screen.findByText(/Votre message a bien été transmis/)).toBeTruthy()
    const post = sent('POST', '/contact-messages')!
    expect(post.body.name).toBe('Awa K.')
    expect(String(post.body.message)).toContain('Objet : Question générale')
    expect(post.body.website).toBe('')
    cleanup()

    signIn('admin')                                   // l'administrateur se connecte plus tard
    open('/admin/notifications')
    fireEvent.click(await screen.findByText('Nouveau message de contact'))
    expect(await screen.findByText(/comment réserver un camion pour Cotonou/, { selector: 'div' })).toBeTruthy()
    await waitFor(() => expect(sent('PUT', '/admin/contact-messages/7')?.body.status).toBe('lu'))
    expect(sent('POST', '/notifications/1/read')).toBeTruthy()
  })
  it('le message est refusé côté formulaire s’il est trop court', async () => {
    signIn(null); open('/contact')
    fireEvent.change(await screen.findByLabelText(/Nom complet/), { target: { value: 'Awa' } })
    fireEvent.change(screen.getByLabelText(/Votre message/), { target: { value: 'court' } })
    await click(/Envoyer le message/)
    expect(await screen.findByText(/au moins 10 caractères/)).toBeTruthy()
    expect(sent('POST', '/contact-messages')).toBeUndefined()
  })
})

describe('connexion', () => {
  it('affiche l’erreur de l’API puis ouvre l’espace client', async () => {
    signIn(null); open('/connexion')
    fireEvent.change(await screen.findByLabelText(/Numéro de téléphone/), { target: { value: '0100000011' } })
    fireEvent.change(screen.getByLabelText(/Mot de passe/), { target: { value: 'mauvais' } })
    await click(/Se connecter/)
    expect(await screen.findByText('Identifiants incorrects.')).toBeTruthy()
    fireEvent.change(screen.getByLabelText(/Mot de passe/), { target: { value: 'bon-mot-de-passe' } })
    await click(/Se connecter/)
    expect(await screen.findByText(/Bienvenue Sophie/)).toBeTruthy()
  })
})

describe('actions administrateur', () => {
  it('valide un transporteur', async () => {
    signIn('admin'); open('/admin/transporteurs')
    await click('Valider')
    await waitFor(() => expect(sent('PUT', '/admin/users/21/status')?.body).toEqual({ status: 'actif' }))
  })
  it('valide un regroupement proposé', async () => {
    signIn('admin'); open('/admin/mutualisations')
    await click('Valider la mutualisation')
    await waitFor(() => expect(sent('POST', '/admin/poolings/61/validate')).toBeTruthy())
  })
  it('crée un regroupement avec les demandes suggérées et l’aperçu du serveur', async () => {
    signIn('admin'); open('/admin/mutualisations?offre=1')
    const create = await screen.findByRole('button', { name: 'Créer le regroupement' })
    await waitFor(() => expect((create as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(create)
    await waitFor(() => expect(sent('POST', '/admin/poolings')?.body).toEqual({ offer_id: 1, request_ids: [31] }))
  })
  it('affecte une demande à une offre depuis le matching (propose un regroupement)', async () => {
    signIn('admin'); open('/admin/matching?demande=31')
    await click('Affecter')
    await waitFor(() => expect(sent('POST', '/admin/poolings')?.body).toEqual({ offer_id: 1, request_ids: [31] }))
  })
  it('enregistre les paramètres (commission) sur le serveur', async () => {
    signIn('admin'); open('/admin/parametres')
    fireEvent.change(await screen.findByLabelText(/Taux/), { target: { value: '8' } })
    await click('Enregistrer')
    await waitFor(() => expect(sent('PUT', '/admin/settings')?.body.commission_pct).toBe(8))
  })
  it('refuse un taux de commission hors limites sans appeler le serveur', async () => {
    signIn('admin'); open('/admin/parametres')
    fireEvent.change(await screen.findByLabelText(/Taux/), { target: { value: '15' } })
    await click('Enregistrer')
    expect(await screen.findByText(/entre 5 % et 10 %/)).toBeTruthy()
    expect(sent('PUT', '/admin/settings')).toBeUndefined()
  })
  it('confirme un paiement déclaré', async () => {
    signIn('admin'); open('/admin/paiements')
    await click('Confirmer')
    await waitFor(() => expect(sent('PUT', '/admin/payments/51/status')?.body).toEqual({ status: 'confirme' }))
  })
})

describe('actions client', () => {
  it('réserve un transport avec une de ses demandes en recherche', async () => {
    signIn('client'); open('/client/transports/1')
    await click('Réserver ce transport')
    await click('Envoyer la réservation')
    await waitFor(() => expect(sent('POST', '/client/reservations')?.body).toEqual({ request_id: 31, offer_id: 1 }))
  })
  it('déclare son paiement avec le moyen et la référence', async () => {
    signIn('client'); open('/client/expeditions/41')
    await click('Payer')
    fireEvent.change(await screen.findByLabelText(/Référence de la transaction/), { target: { value: 'MM12345' } })
    await click(/J'ai effectué le paiement/)
    await waitFor(() => expect(sent('PUT', '/client/payments/51/declare')?.body).toEqual({ method: 'mobile_money', reference: 'MM12345' }))
  })
})

describe('actions transporteur', () => {
  it('accepte un regroupement validé', async () => {
    signIn('transporteur'); open('/transporteur/demandes')
    await click('Accepter')
    await waitFor(() => expect(sent('POST', '/carrier/poolings/61/respond')?.body).toEqual({ accept: true }))
  })
  it('met à jour le statut d’un transport en cours', async () => {
    signIn('transporteur'); open('/transporteur/transports')
    await click('Arrivé à destination')
    await waitFor(() => expect(sent('PUT', '/transports/41/status')?.body).toEqual({ status: 'arrive_destination' }))
  })
})

describe('erreurs de l’API', () => {
  it('une erreur serveur est affichée avec un bouton Réessayer', async () => {
    state.override = (call) => (call.path === '/admin/commissions' ? { __status: 500, message: 'Erreur interne du serveur.' } : undefined)
    signIn('admin'); open('/admin/commissions')
    expect(await screen.findByText('Erreur interne du serveur.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeTruthy()
  })
})
