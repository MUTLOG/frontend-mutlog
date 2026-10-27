/** Couche d'accès centralisée aux routes décrites dans api-endpoints.md. */
import { api, apiData, API_BASE_URL, getToken, toSnake } from './api'
import type { GoodsType } from '@/domain/types'
import type { OperationStatus } from '@/types/operation'

export const authApi = {
  login: (phone: string, password: string) => api<{ user: import('./api').ApiUser; token: string }>('/auth/login', { method: 'POST', json: { phone, password } }),
  register: (input: Record<string, unknown>) => api<{ user: import('./api').ApiUser; token: string }>('/auth/register', { method: 'POST', json: input }),
  logout: () => api('/auth/logout', { method: 'POST' }),
  me: () => apiData<import('./api').ApiUser>('/me'),
  forgot: (phone: string) => api<{ message: string; demoCode?: string }>('/auth/forgot', { method: 'POST', json: { phone } }),
  reset: (phone: string, code: string, password: string) => api('/auth/reset', { method: 'POST', json: { phone, code, password } }),
  updateProfile: (input: Record<string, unknown>) => apiData<import('./api').ApiUser>('/me', { method: 'PUT', json: input }),
  changePassword: (currentPassword: string, password: string) => api('/me/password', { method: 'PUT', json: { currentPassword, password } }),
  documents: (documents: string[]) => apiData<import('./api').ApiUser>('/me/documents', { method: 'PUT', json: { documents } }),
}

export const contactApi = {
  send: (input: { name: string; phone?: string; message: string; website?: string }) =>
    apiData<{ id: number; status: string }>('/contact-messages', {
      method: 'POST',
      json: input,
    }),
}

export const publicApi = {
  cities: () => apiData<Array<{ name: string; lat?: number; lng?: number; department?: string }>>('/cities'),
  settings: () => apiData<PublicSettings>('/settings/public'),
  offers: (params: Record<string, string | number | undefined> = {}) => {
    const query = new URLSearchParams()
    // Le backend attend des clés en snake_case (weight_t) : sans conversion, le filtre de poids était ignoré.
    Object.entries(toSnake(params) as Record<string, string | number | undefined>).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, String(value)) })
    return apiData<RemoteOffer[]>(`/offers${query.toString() ? `?${query}` : ''}`)
  },
  offer: (id: string | number) => apiData<RemoteOffer>(`/offers/${id}`),
}

/** Réglages publics (GET /settings/public) : commission, rayon de proximité, consignes de paiement… */
export type PublicSettings = {
  commissionPct: number; commissionBearer: 'transporteur' | 'clients'; shareBasis: string
  cityRadiusKm: number; dateToleranceDays: number; paymentInstructions: string
}
export const EMPTY_PUBLIC_SETTINGS: PublicSettings = {
  commissionPct: 0, commissionBearer: 'transporteur', shareBasis: '', cityRadiusKm: 0, dateToleranceDays: 0, paymentInstructions: '',
}

export type RemoteOffer = {
  id: string | number; from: string; to: string; date: string; totalCapacityT: number; availableT: number;
  goodsAccepted: string[]; pricingMode: 'tonne' | 'forfait'; price: number; notes?: string; status: string;
  transporter?: { id: string | number; displayName?: string; firstName?: string; lastName?: string; status?: string; verified?: boolean; rating?: { avg: number; count: number } | null };
  vehicle?: { type: string; capacityT: number; plate?: string };
}

type ApiId = string | number
type UserBrief = { id: ApiId; displayName?: string; firstName?: string; city?: string; role?: string; status?: string; rating?: { avg: number; count: number } | null }
export type AdminRequest = {
  id: ApiId; from: string; to: string; date: string; goods: string; weightT: number; volumeM3?: number; parcels?: number;
  description: string; requirements?: string; attachments: string[]; contact: string; status: string; poolingId?: ApiId | null;
  client?: UserBrief; createdAt?: string;
}
export type AdminReservation = {
  id: ApiId; requestId: ApiId; offerId: ApiId; clientId: ApiId; transporterId: ApiId; weightT: number; status: string;
  offer?: RemoteOffer; request?: AdminRequest; createdAt?: string;
}
export type AdminVehicle = {
  id: ApiId; ownerId: ApiId; type: string; brand?: string | null; plate: string; capacityT: number; volumeM3: number;
  goodsAccepted: GoodsType[]; available: boolean; active: boolean;
}
export type AdminPooling = {
  id: ApiId; offerId: ApiId; status: string; transportId?: ApiId | null;
  finance: { gross: number; ratePct: number; commission: number; netCarrier: number; bearer: 'transporteur' | 'clients' };
  shares: Array<{ requestId: ApiId; clientId: ApiId; weightT: number; amount: number; payable: number; clientName?: string | null }>;
  offer?: RemoteOffer; createdAt?: string;
}
export type AdminPoolingPreview = { finance: AdminPooling['finance']; shares: AdminPooling['shares'] }
/** Panne en cours (signalée ou prise en charge) sur un transport : type, urgence, lieu et état uniquement. */
export type TransportBreakdown = { id: ApiId; kind: string; urgency: string; location: string; status: string; createdAt?: string }
export type AdminTransport = {
  id: ApiId; ref: string; status: string; poolingId: ApiId; offer: RemoteOffer; breakdown?: TransportBreakdown | null; createdAt?: string;
  events: Array<{ id: ApiId; kind: 'statut' | 'position'; label: string; lat?: number | null; lng?: number | null; at: string }>;
  finance?: AdminPooling['finance'];
  clients?: Array<{ clientId: ApiId; requestId: ApiId; weightT: number; amount: number; payable: number; name: string; phone?: string | null }>;
  payments?: AdminPayment[];
}
export type AdminPayment = {
  id: ApiId; transportId: ApiId; requestId: ApiId; clientId: ApiId; amount: number; method: string; status: 'en_attente' | 'confirme' | 'echoue' | 'rembourse';
  reference?: string | null; receiptNo?: string | null; confirmedAt?: string | null; createdAt?: string; transportRef?: string; clientName?: string;
}
export type AdminReview = {
  id: ApiId; transportId: ApiId; fromId: ApiId; toId: ApiId; rating: number; comment?: string | null; reported: boolean; createdAt: string;
  author?: UserBrief; target?: UserBrief;
}
export type AdminAuditRecord = { id: ApiId; actor?: string | null; action: string; detail: string; createdAt: string }
export type AdminDashboardSummary = {
  clients: number; carriers: number; carriersToValidate: number; vehicles: number; vehiclesAvailable: number;
  requests: number; requestsSearching: number; transportsConfirmed: number; transportsMoving: number;
  transportsDone: number; cancelled: number; poolings: number; poolingsMulti: number; transportAmount: number;
  commissionAcquired: number; commissionPlanned: number; paymentsToReview: number; poolingsToValidate: number; fillRate: number;
}
export type AdminFinanceSummary = {
  revenue: number; commissionAcquired: number; commissionPlanned: number; paymentsConfirmed: number; paymentsWaiting: number;
  refunded: number; ratePct: number; bearer: 'transporteur' | 'clients';
  rows: Array<{ transportRef: string; gross: number; ratePct: number; commission: number; netCarrier: number; status: string }>;
}
export type AdminStatsSummary = {
  done: number; poolingsMulti: number; avgRating: number | null; topRoutes: Array<{ route: string; count: number }>; commissionByMonth: Record<string, number>;
}
export type AdminMatchingOffer = { offer: RemoteOffer; compatibleRequests: number }
export type AdminMatch = { offer: RemoteOffer; score: number; criteria: Array<{ key: string; label: string; ok: boolean; ratio: number }> }

export type PaymentMethod = 'mobile_money' | 'especes' | 'virement' | 'autre'
export type ReservationStatus = 'en_attente' | 'confirmee' | 'refusee' | 'annulee'
export type ClientRequest = {
  id: ApiId; from: string; to: string; date: string; goods: GoodsType; weightT: number; volumeM3?: number | null; parcels?: number | null
  description?: string | null; requirements?: string | null; attachments: string[]; contact: string
  status: OperationStatus; poolingId?: ApiId | null; createdAt: string
}
export type ClientMatch = { offer: RemoteOffer; score: number; criteria: Array<{ key: string; label: string; ok: boolean; ratio: number }> }
export type ClientReservation = {
  id: ApiId; requestId: ApiId; offerId: ApiId; clientId: ApiId; transporterId: ApiId; weightT: number
  status: ReservationStatus; offer?: RemoteOffer; createdAt?: string
}
export type ClientRequestDetail = ClientRequest & {
  matches: ClientMatch[]; reservations: ClientReservation[]
  share: { weightT: number; amount: number; payable: number } | null; transportId?: ApiId | null
}
export type ClientShipment = {
  id: ApiId; ref: string; status: OperationStatus; poolingId: ApiId; offer: RemoteOffer; events: AdminTransport['events']; createdAt?: string
  breakdown?: TransportBreakdown | null
  share?: { requestId: ApiId; weightT: number; amount: number; payable: number }
  payment?: AdminPayment | null; carrierPhone?: string | null
}

export const clientApi = {
  requests: (query = '') => apiData<ClientRequest[]>(`/client/requests${query}`),
  createRequest: (input: Record<string, unknown>) => apiData<ClientRequest>('/client/requests', { method: 'POST', json: input }),
  request: (id: string | number) => apiData<ClientRequestDetail>(`/client/requests/${id}`),
  cancelRequest: (id: string | number) => apiData<ClientRequest>(`/client/requests/${id}/cancel`, { method: 'POST' }),
  reservations: (query = '?per_page=100') => apiData<ClientReservation[]>(`/client/reservations${query}`),
  reserve: (requestId: string | number, offerId: string | number) => apiData<ClientReservation>('/client/reservations', { method: 'POST', json: { requestId, offerId } }),
  shipments: (query = '?per_page=100') => apiData<ClientShipment[]>(`/client/shipments${query}`),
  /** Détail d'une expédition du client (GET /transports/{id}, autorisé aux clients ayant une part). */
  shipment: (id: string | number) => apiData<ClientShipment>(`/transports/${id}`),
  declarePayment: (id: string | number, method: PaymentMethod, reference: string) => apiData<AdminPayment>(`/client/payments/${id}/declare`, { method: 'PUT', json: { method, reference } }),
  confirmReceipt: (transportId: string | number) => apiData<ClientShipment>(`/client/transports/${transportId}/confirm-receipt`, { method: 'POST' }),
}

export type CarrierReservation = {
  id: ApiId; requestId: ApiId; offerId: ApiId; clientId: ApiId; transporterId: ApiId; weightT: number
  status: ReservationStatus; offer?: RemoteOffer; request?: ClientRequest & { client?: { id: ApiId; displayName?: string; firstName?: string } }; createdAt?: string
}
export type CarrierOfferDetail = RemoteOffer & { compatibleRequests: number; reservations: CarrierReservation[] }
export type CarrierPoolingDetail = AdminPooling & {
  goods: Array<{ clientName: string; goods: GoodsType; weightT: number; parcels?: number | null; description?: string | null; requirements?: string | null; phone?: string | null }>
}
export type CarrierRevenue = { netReceived: number; netPending: number; commissionPaid: number; monthly: Array<{ month: string; net: number }> }
export type BreakdownKind = 'mecanique' | 'pneu' | 'accident' | 'carburant' | 'autre'
export type BreakdownUrgency = 'moderee' | 'elevee' | 'critique'
export type CarrierBreakdown = {
  id: ApiId; transportId: ApiId | null; kind: BreakdownKind; urgency: BreakdownUrgency; location: string; description: string
  status: 'en_attente' | 'prise_en_charge' | 'resolue' | 'cloturee'; adminNotes?: string | null; createdAt: string
  transport?: { ref?: string; status?: string; offer?: { from: string; to: string } }
}

export const carrierApi = {
  offers: (query = '?per_page=100') => apiData<RemoteOffer[]>(`/carrier/offers${query}`),
  createOffer: (input: Record<string, unknown>) => apiData<RemoteOffer>('/carrier/offers', { method: 'POST', json: input }),
  offer: (id: string | number) => apiData<CarrierOfferDetail>(`/carrier/offers/${id}`),
  cancelOffer: (id: string | number) => apiData<RemoteOffer>(`/carrier/offers/${id}/cancel`, { method: 'POST' }),
  vehicles: () => apiData<AdminVehicle[]>('/carrier/vehicles'),
  createVehicle: (input: Record<string, unknown>) => apiData<AdminVehicle>('/carrier/vehicles', { method: 'POST', json: input }),
  updateVehicle: (id: string | number, input: Record<string, unknown>) => apiData<AdminVehicle>(`/carrier/vehicles/${id}`, { method: 'PUT', json: input }),
  reservations: (query = '?per_page=100') => apiData<CarrierReservation[]>(`/carrier/reservations${query}`),
  /** Regroupements validés par MUTLOG (en attente de réponse) ou confirmés ; `?status=` pour filtrer. */
  poolings: (query = '?per_page=100') => apiData<AdminPooling[]>(`/carrier/poolings${query}`),
  pooling: (id: string | number) => apiData<CarrierPoolingDetail>(`/carrier/poolings/${id}`),
  respondToPooling: (id: string | number, accept: boolean) => apiData<{ accepted: boolean; transportRef: string | null }>(`/carrier/poolings/${id}/respond`, { method: 'POST', json: { accept } }),
  transports: (query = '?per_page=100') => apiData<AdminTransport[]>(`/carrier/transports${query}`),
  revenue: () => apiData<CarrierRevenue>('/carrier/revenue'),
  breakdowns: (query = '?per_page=100') => apiData<CarrierBreakdown[]>(`/carrier/breakdowns${query}`),
  /** Renvoie aussi le message du serveur (« N clients ont été prévenus par notification et SMS »). */
  createBreakdown: (input: Record<string, unknown>) => api<{ data: CarrierBreakdown; message?: string }>('/carrier/breakdowns', { method: 'POST', json: input }),
}

export const adminApi = {
  dashboard: (query = '') => apiData<AdminDashboardSummary>(`/admin/dashboard${query}`),
  stats: () => apiData<AdminStatsSummary>('/admin/stats'),
  users: (query = '') => apiData<import('./api').ApiUser[]>(`/admin/users${query}`),
  user: (id: string | number) => apiData<import('./api').ApiUser & { vehicles: Array<{ id: ApiId; type: string; plate: string; capacityT: number; available: boolean; active: boolean }> }>(`/admin/users/${id}`),
  createUser: (input: Record<string, unknown>) => apiData<unknown>('/admin/users', { method: 'POST', json: input }),
  updateUser: (id: string | number, input: Record<string, unknown>) => apiData<unknown>(`/admin/users/${id}`, { method: 'PUT', json: input }),
  setUserStatus: (id: string | number, input: Record<string, unknown>) => apiData<unknown>(`/admin/users/${id}/status`, { method: 'PUT', json: input }),
  deleteUser: (id: string | number) => api(`/admin/users/${id}`, { method: 'DELETE' }),
  vehicles: () => apiData<AdminVehicle[]>('/admin/vehicles'),
  createVehicle: (input: Record<string, unknown>) => apiData<AdminVehicle>('/admin/vehicles', { method: 'POST', json: input }),
  updateVehicle: (id: string | number, input: Record<string, unknown>) => apiData<AdminVehicle>(`/admin/vehicles/${id}`, { method: 'PUT', json: input }),
  offers: (query = '') => apiData<RemoteOffer[]>(`/admin/offers${query}`),
  cancelOffer: (id: string | number) => apiData<RemoteOffer>(`/admin/offers/${id}/cancel`, { method: 'POST' }),
  requests: (query = '') => apiData<AdminRequest[]>(`/admin/requests${query}`),
  setRequestStatus: (id: string | number, status: string) => apiData<AdminRequest>(`/admin/requests/${id}/status`, { method: 'PUT', json: { status } }),
  reservations: () => apiData<AdminReservation[]>('/admin/reservations'),
  transports: (query = '') => apiData<AdminTransport[]>(`/admin/transports${query}`),
  matchingOffers: () => apiData<AdminMatchingOffer[]>('/admin/matching/offers'),
  matchingRequest: (id: string | number) => apiData<AdminMatch[]>(`/admin/matching/requests/${id}`),
  poolings: (query = '') => apiData<AdminPooling[]>(`/admin/poolings${query}`),
  poolingCandidates: (offerId: string | number) => apiData<{ offer: RemoteOffer; candidates: AdminRequest[]; suggestedIds: ApiId[] }>(`/admin/poolings/candidates/${offerId}`),
  previewPooling: (input: Record<string, unknown>) => apiData<AdminPoolingPreview>('/admin/poolings/preview', { method: 'POST', json: input }),
  createPooling: (input: Record<string, unknown>) => apiData<AdminPooling>('/admin/poolings', { method: 'POST', json: input }),
  updatePooling: (id: string | number, input: Record<string, unknown>) => apiData<AdminPooling>(`/admin/poolings/${id}`, { method: 'PUT', json: input }),
  validatePooling: (id: string | number) => apiData<AdminPooling>(`/admin/poolings/${id}/validate`, { method: 'POST' }),
  refusePooling: (id: string | number, input: Record<string, unknown> = {}) => apiData<unknown>(`/admin/poolings/${id}/refuse`, { method: 'POST', json: input }),
  setPaymentStatus: (id: string | number, input: Record<string, unknown>) => apiData<unknown>(`/admin/payments/${id}/status`, { method: 'PUT', json: input }),
  deleteReview: (id: string | number) => api(`/admin/reviews/${id}`, { method: 'DELETE' }),
  commissions: () => apiData<AdminFinanceSummary>('/admin/commissions'),
  settings: () => apiData<unknown>('/admin/settings'),
  updateSettings: (input: Record<string, unknown>) => apiData<unknown>('/admin/settings', { method: 'PUT', json: input }),
  audit: (query = '') => apiData<AdminAuditRecord[]>(`/admin/audit${query}`),
  contactMessages: () => apiData<unknown>('/admin/contact-messages'),
  updateContactMessage: (id: number | string, status: string) => apiData<unknown>(`/admin/contact-messages/${id}`, { method: 'PUT', json: { status } }),
  breakdowns: (filters: { status?: string; urgency?: string } = {}) => {
  const q = new URLSearchParams()
  if (filters.status) q.set('status', filters.status)
  if (filters.urgency) q.set('urgency', filters.urgency)
  return apiData<unknown>(`/admin/breakdowns${q.size ? `?${q}` : ''}`)
  },
  updateBreakdown: (id: number | string, input: Record<string, unknown>) => apiData<unknown>(`/admin/breakdowns/${id}`, { method: 'PUT', json: input }),
}

export type MessagePeer = { id: ApiId; displayName: string; role: 'client' | 'transporteur' | 'admin' }
export type ThreadMessage = { id: ApiId; fromId: ApiId; toId: ApiId; text: string; createdAt: string }

export const sharedApi = {
  notifications: () => apiData<unknown>('/notifications'),
  markNotificationsRead: () => api('/notifications/read-all', { method: 'POST' }),
  markNotificationRead: (id: string | number) => api(`/notifications/${id}/read`, { method: 'POST' }),
  /** Sans argument : les interlocuteurs ; avec un identifiant : la conversation avec cette personne. */
  peers: () => apiData<MessagePeer[]>('/messages'),
  thread: (withUser: string | number) => apiData<ThreadMessage[]>(`/messages?with=${encodeURIComponent(String(withUser))}`),
  sendMessage: (input: { toId: string | number; text: string; transportId?: string | number; offerId?: string | number }) => apiData<ThreadMessage>('/messages', { method: 'POST', json: input }),
  payments: (query = '') => apiData<AdminPayment[]>(`/payments${query}`),
  reviews: (query = '') => apiData<AdminReview[]>(`/reviews${query}`),
  reportReview: (id: string | number) => api(`/reviews/${id}/report`, { method: 'POST' }),
  transport: (id: string | number) => apiData<AdminTransport>(`/transports/${id}`),
  updateTransportStatus: (id: string | number, status: string, position?: { lat: number; lng: number }) => apiData<AdminTransport>(`/transports/${id}/status`, { method: 'PUT', json: { status, ...position } }),
  recordPosition: (id: string | number, input: { lat: number; lng: number; label: string }) => apiData<unknown>(`/transports/${id}/positions`, { method: 'POST', json: input }),
  reviewTransport: (id: string | number, input: { toId: string | number; rating: number; comment?: string }) => apiData<AdminReview>(`/transports/${id}/reviews`, { method: 'POST', json: input }),
}

// ───────────────────────── Appels vocaux (WebRTC) ─────────────────────────

export type CallStatus = 'ringing' | 'accepted' | 'declined' | 'missed' | 'cancelled' | 'ended'
export type CallInfo = {
  id: ApiId; status: CallStatus; direction: 'outgoing' | 'incoming'
  peer: { id: ApiId; displayName: string; role: string }
  /** Description de session de l'appelant : transmise uniquement au destinataire pendant la sonnerie. */
  offer: string | null
  /** Réponse du destinataire : transmise uniquement à l'appelant une fois l'appel décroché. */
  answer: string | null
  createdAt: string; answeredAt: string | null; endedAt: string | null; endReason: string | null; durationSeconds: number
}
export type IceServerDto = { urls: string | string[]; username?: string; credential?: string }

export const callApi = {
  /** Appel en cours (sonnerie ou conversation) ou null : interrogé régulièrement pour détecter un appel entrant. */
  current: () => apiData<CallInfo | null>('/calls/current'),
  iceServers: () => apiData<IceServerDto[]>('/calls/ice-servers'),
  start: (input: { toId: string | number; offer: string }) => apiData<CallInfo>('/calls', { method: 'POST', json: input }),
  show: (id: string | number) => apiData<CallInfo>(`/calls/${id}`),
  accept: (id: string | number, answer: string) => apiData<CallInfo>(`/calls/${id}/accept`, { method: 'POST', json: { answer } }),
  decline: (id: string | number) => apiData<CallInfo>(`/calls/${id}/decline`, { method: 'POST' }),
  end: (id: string | number) => apiData<CallInfo>(`/calls/${id}/end`, { method: 'POST' }),
  /** Fermeture de l'onglet en pleine conversation : la requête doit partir même si la page se décharge (keepalive). */
  endOnUnload: (id: string | number) => {
    try {
      void fetch(`${API_BASE_URL}/calls/${id}/end`, { method: 'POST', keepalive: true, headers: { Accept: 'application/json', Authorization: `Bearer ${getToken() ?? ''}` } }).catch(() => undefined)
    } catch { /* page en cours de fermeture : sans importance */ }
  },
}
