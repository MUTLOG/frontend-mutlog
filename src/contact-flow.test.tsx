// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Parcours : visiteur → message → notification admin → lecture dans « Messages de contact ».
// L'API Laravel est simulée ; ce test vérifie que l'interface sait afficher ce que le serveur renvoie.
const h = vi.hoisted(() => ({
  messages: [] as Array<Record<string, unknown>>,
  notifications: [] as Array<Record<string, unknown>>,
  send: vi.fn(async (_input: unknown) => ({ id: 7 })),
  updateContactMessage: vi.fn(async (_id: unknown, _status: unknown) => ({})),
  markNotificationRead: vi.fn(async (_id: unknown) => ({})),
  admin: { id: 1, role: 'admin', userType: 'admin', firstName: 'Admin', lastName: 'MUTLOG', phone: '+22901000000', email: null, address: 'Cotonou', city: 'Cotonou', status: 'actif' },
}))

vi.mock('@/services/api', async (orig) => ({
  ...(await orig<typeof import('@/services/api')>()),
  getApiUser: () => h.admin,
}))
vi.mock('@/services/mutlogApi', async (orig) => {
  const real = await orig<typeof import('@/services/mutlogApi')>()
  return {
    ...real,
    contactApi: { send: h.send },
    adminApi: { ...real.adminApi, contactMessages: async () => h.messages, updateContactMessage: h.updateContactMessage },
    sharedApi: { ...real.sharedApi, notifications: async () => h.notifications, markNotificationRead: h.markNotificationRead, markNotificationsRead: async () => ({}) },
  }
})

import App from './App'

beforeAll(() => {
  ;(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
  window.scrollTo = () => {}
  Element.prototype.scrollIntoView = () => {}
})

beforeEach(() => {
  cleanup()
  vi.clearAllMocks()
  h.messages = [{ id: 7, name: 'Awa K.', phone: '0197000000', message: 'Objet : Question générale\n\nBonjour, comment réserver un camion pour Cotonou ?', status: 'nouveau', createdAt: '2026-10-17T09:00:00Z' }]
  h.notifications = [{ id: 1, title: 'Nouveau message de contact', body: 'Awa K. (0197000000) : Bonjour', link: '/admin/messages-contact?message=7', read: false, createdAt: '2026-10-17T09:00:01Z' }]
})

const open = (path: string) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)

describe('messages de contact : du visiteur à l’administrateur', () => {
  it('le visiteur non connecté envoie son message à l’API (champ piège vide)', async () => {
    // La page publique ne dépend pas de la session : on la teste avec les mêmes mocks.
    open('/contact')
    fireEvent.change(await screen.findByLabelText(/Nom complet/), { target: { value: 'Awa K.' } })
    fireEvent.change(screen.getByLabelText(/Votre message/), { target: { value: 'Bonjour, comment réserver un camion ?' } })
    fireEvent.click(screen.getByRole('button', { name: /Envoyer le message/ }))
    await waitFor(() => expect(h.send).toHaveBeenCalledTimes(1))
    const sent = h.send.mock.calls[0][0] as { name: string; message: string; website: string }
    expect(sent.name).toBe('Awa K.')
    expect(sent.message).toContain('Objet : Question générale')
    expect(sent.website).toBe('')
    expect(await screen.findByText(/Votre message a bien été transmis/)).toBeTruthy()
  })

  it('la cloche et la page Notifications affichent la notification créée par le serveur', async () => {
    open('/admin/notifications')
    expect(await screen.findByText('Nouveau message de contact')).toBeTruthy()
    expect(screen.getByLabelText('1 notifications non lues')).toBeTruthy()
  })

  it('cliquer la notification ouvre le message, le marque lu et le notifie comme lu côté serveur', async () => {
    open('/admin/notifications')
    fireEvent.click(await screen.findByText('Nouveau message de contact'))
    expect(await screen.findByText(/comment réserver un camion pour Cotonou/, { selector: 'div' })).toBeTruthy()
    await waitFor(() => expect(h.updateContactMessage).toHaveBeenCalledWith(7, 'lu'))
    expect(h.markNotificationRead).toHaveBeenCalledWith('1')
  })

  it('le lien direct /admin/messages-contact?message=ID ouvre le bon message', async () => {
    h.messages.push({ id: 8, name: 'Koffi M.', phone: null, message: 'Autre demande', status: 'lu', createdAt: '2026-10-16T09:00:00Z' })
    open('/admin/messages-contact?message=8')
    expect(await screen.findByRole('heading', { name: 'Koffi M.' })).toBeTruthy()
    expect(h.updateContactMessage).not.toHaveBeenCalled() // déjà lu : pas de nouvel appel
  })

  it('le message peut être marqué comme traité', async () => {
    open('/admin/messages-contact?message=7')
    fireEvent.click(await screen.findByRole('button', { name: 'Marquer comme traité' }))
    await waitFor(() => expect(h.updateContactMessage).toHaveBeenCalledWith(7, 'traite'))
  })
})
