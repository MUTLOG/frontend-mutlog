/** Couche d'accès centralisée aux routes décrites dans api-endpoints.md. */
import { api, apiData } from './api'
import type { ApiUser } from './api'

export const authApi = {
  login: (phone: string, password: string) => api<{ user: import('./api').ApiUser; token: string }>('/auth/login', { method: 'POST', json: { phone, password } }),
  register: (input: Record<string, unknown>) => api<{ user: import('./api').ApiUser; token: string }>('/auth/register', { method: 'POST', json: input }),
  logout: () => api('/auth/logout', { method: 'POST' }),
  me: () => apiData<import('./api').ApiUser>('/me'),
  forgot: (phone: string) => api<{ message: string; demoCode?: string }>('/auth/forgot', { method: 'POST', json: { phone } }),
  reset: (phone: string, code: string, password: string) => api('/auth/reset', { method: 'POST', json: { phone, code, password } }),
  updateProfile: (input: Record<string, unknown>) => api('/me', { method: 'PUT', json: input }),
  changePassword: (currentPassword: string, password: string) => api('/me/password', { method: 'PUT', json: { currentPassword, password } }),
}

export const contactApi = {
  send: (input: { name: string; phone?: string; message: string }) =>
    apiData<{ id: number; status: string }>('/contact-messages', {
      method: 'POST',
      json: input,
    }),
}

export const publicApi = {
  cities: () => apiData<Array<{ name: string; lat?: number; lng?: number; department?: string }>>('/cities'),
  settings: () => apiData<Record<string, unknown>>('/settings/public'),
  offers: (params: Record<string, string | number | undefined> = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, String(value)) })
    return apiData<RemoteOffer[]>(`/offers${query.toString() ? `?${query}` : ''}`)
  },
  offer: (id: string | number) => apiData<RemoteOffer>(`/offers/${id}`),
}

export type RemoteOffer = {
  id: string | number; from: string; to: string; date: string; totalCapacityT: number; availableT: number;
  goodsAccepted: string[]; pricingMode: 'tonne' | 'forfait'; price: number; notes?: string; status: string;
  transporter?: { id: string | number; displayName?: string; firstName?: string; lastName?: string; status?: string; rating?: { avg: number; count: number } | null };
  vehicle?: { type: string; capacityT: number };
}

export const clientApi = {
  requests: (query = '') => apiData<unknown>(`/client/requests${query}`),
  createRequest: (input: Record<string, unknown>) => apiData<unknown>('/client/requests', { method: 'POST', json: input }),
  request: (id: string | number) => apiData<unknown>(`/client/requests/${id}`),
  cancelRequest: (id: string | number) => apiData<unknown>(`/client/requests/${id}/cancel`, { method: 'POST' }),
  reservations: () => apiData<unknown>('/client/reservations'),
  reserve: (requestId: string | number, offerId: string | number) => apiData<unknown>('/client/reservations', { method: 'POST', json: { requestId, offerId } }),
  shipments: () => apiData<unknown>('/client/shipments'),
  declarePayment: (id: string | number, reference: string) => apiData<unknown>(`/client/payments/${id}/declare`, { method: 'PUT', json: { reference } }),
  confirmReceipt: (transportId: string | number) => apiData<unknown>(`/client/transports/${transportId}/confirm-receipt`, { method: 'POST' }),
}

export const carrierApi = {
  offers: () => apiData<unknown>('/carrier/offers'),
  createOffer: (input: Record<string, unknown>) => apiData<unknown>('/carrier/offers', { method: 'POST', json: input }),
  offer: (id: string | number) => apiData<unknown>(`/carrier/offers/${id}`),
  cancelOffer: (id: string | number) => apiData<unknown>(`/carrier/offers/${id}/cancel`, { method: 'POST' }),
  vehicles: () => apiData<unknown>('/carrier/vehicles'),
  createVehicle: (input: Record<string, unknown>) => apiData<unknown>('/carrier/vehicles', { method: 'POST', json: input }),
  updateVehicle: (id: string | number, input: Record<string, unknown>) => apiData<unknown>(`/carrier/vehicles/${id}`, { method: 'PUT', json: input }),
  reservations: () => apiData<unknown>('/carrier/reservations'),
  poolings: () => apiData<unknown>('/carrier/poolings'),
  respondToPooling: (id: string | number, accept: boolean) => apiData<unknown>(`/carrier/poolings/${id}/respond`, { method: 'POST', json: { accept } }),
  transports: () => apiData<unknown>('/carrier/transports'),
  revenue: () => apiData<unknown>('/carrier/revenue'),
  breakdowns: () => apiData<unknown>('/carrier/breakdowns'),
  createBreakdown: (input: Record<string, unknown>) => apiData<unknown>('/carrier/breakdowns', { method: 'POST', json: input }),
}

export type ContactMessage = {
  id: number
  name: string
  phone: string | null
  message: string
  status: string
  createdAt: string | null
}

export const adminApi = {
  dashboard: (query = '') => apiData<unknown>(`/admin/dashboard${query}`),
  stats: () => apiData<unknown>('/admin/stats'),
  contactMessages: () => apiData<ContactMessage[]>('/admin/contact-messages'),
  users: (query = '') => apiData<ApiUser[]>(`/admin/users${query}`),
  user: (id: string | number) => apiData<unknown>(`/admin/users/${id}`),
  createUser: (input: Record<string, unknown>) => apiData<unknown>('/admin/users', { method: 'POST', json: input }),
  updateUser: (id: string | number, input: Record<string, unknown>) => apiData<unknown>(`/admin/users/${id}`, { method: 'PUT', json: input }),
  setUserStatus: (id: string | number, input: Record<string, unknown>) => apiData<unknown>(`/admin/users/${id}/status`, { method: 'PUT', json: input }),
  deleteUser: (id: string | number) => api(`/admin/users/${id}`, { method: 'DELETE' }),
  vehicles: () => apiData<unknown>('/admin/vehicles'),
  offers: () => apiData<unknown>('/admin/offers'),
  requests: (query = '') => apiData<unknown>(`/admin/requests${query}`),
  reservations: () => apiData<unknown>('/admin/reservations'),
  transports: (query = '') => apiData<unknown>(`/admin/transports${query}`),
  matchingOffers: () => apiData<unknown>('/admin/matching/offers'),
  matchingRequest: (id: string | number) => apiData<unknown>(`/admin/matching/requests/${id}`),
  poolings: () => apiData<unknown>('/admin/poolings'),
  poolingCandidates: (offerId: string | number) => apiData<unknown>(`/admin/poolings/candidates/${offerId}`),
  previewPooling: (input: Record<string, unknown>) => apiData<unknown>('/admin/poolings/preview', { method: 'POST', json: input }),
  createPooling: (input: Record<string, unknown>) => apiData<unknown>('/admin/poolings', { method: 'POST', json: input }),
  updatePooling: (id: string | number, input: Record<string, unknown>) => apiData<unknown>(`/admin/poolings/${id}`, { method: 'PUT', json: input }),
  validatePooling: (id: string | number) => apiData<unknown>(`/admin/poolings/${id}/validate`, { method: 'POST' }),
  refusePooling: (id: string | number, input: Record<string, unknown> = {}) => apiData<unknown>(`/admin/poolings/${id}/refuse`, { method: 'POST', json: input }),
  setPaymentStatus: (id: string | number, input: Record<string, unknown>) => apiData<unknown>(`/admin/payments/${id}/status`, { method: 'PUT', json: input }),
  commissions: () => apiData<unknown>('/admin/commissions'),
  settings: () => apiData<unknown>('/admin/settings'),
  updateSettings: (input: Record<string, unknown>) => apiData<unknown>('/admin/settings', { method: 'PUT', json: input }),
  audit: () => apiData<unknown>('/admin/audit'),
  breakdowns: (filters: { status?: string; urgency?: string } = {}) => {
  const q = new URLSearchParams()
  if (filters.status) q.set('status', filters.status)
  if (filters.urgency) q.set('urgency', filters.urgency)
  return apiData<unknown>(`/admin/breakdowns${q.size ? `?${q}` : ''}`)
  },
  updateBreakdown: (id: number | string, input: Record<string, unknown>) => apiData<unknown>(`/admin/breakdowns/${id}`, { method: 'PUT', json: input }),
}

export const sharedApi = {
  notifications: () => apiData<unknown>('/notifications'),
  markNotificationsRead: () => api('/notifications/read-all', { method: 'POST' }),
  markNotificationRead: (id: string | number) => api(`/notifications/${id}/read`, { method: 'POST' }),
  messages: (withUser?: string | number) => apiData<unknown>(`/messages${withUser ? `?with=${encodeURIComponent(withUser)}` : ''}`),
  sendMessage: (input: Record<string, unknown>) => apiData<unknown>('/messages', { method: 'POST', json: input }),
  payments: (query = '') => apiData<unknown>(`/payments${query}`),
  reviews: (query = '') => apiData<unknown>(`/reviews${query}`),
  reportReview: (id: string | number, input: Record<string, unknown> = {}) => api(`/reviews/${id}/report`, { method: 'POST', json: input }),
  transport: (id: string | number) => apiData<unknown>(`/transports/${id}`),
  updateTransportStatus: (id: string | number, status: string) => apiData<unknown>(`/transports/${id}/status`, { method: 'PUT', json: { status } }),
  recordPosition: (id: string | number, input: Record<string, unknown>) => apiData<unknown>(`/transports/${id}/positions`, { method: 'POST', json: input }),
  reviewTransport: (id: string | number, input: Record<string, unknown>) => apiData<unknown>(`/transports/${id}/reviews`, { method: 'POST', json: input }),
}
