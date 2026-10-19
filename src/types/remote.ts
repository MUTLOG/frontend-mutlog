import type { OperationStatus } from '@/types/operation'
import type { GoodsType, PaymentStatus, PricingMode } from '@/domain/types'

/**
 * Formes des réponses de l'API Laravel (clés en camelCase après conversion par `toCamel`).
 * Elles reprennent les « Resources » du backend : filtrées selon le profil (noms, téléphones).
 */
export type Role = 'client' | 'transporteur' | 'admin'
export type AccountStatus = 'actif' | 'en_attente' | 'suspendu'
export interface Rating { avg: number; count: number }

export interface UserBrief {
  id: number
  displayName: string
  firstName?: string
  city?: string
  role?: Role
  verified?: boolean
  rating?: Rating | null
}

export interface RemoteUser {
  id: number
  role: Role
  userType: string
  firstName: string
  lastName: string
  company: string | null
  displayName: string
  phone: string
  email: string | null
  address: string
  city: string
  idNumber: string | null
  documents: string[]
  status: AccountStatus
  verified: boolean
  rating: Rating | null
  createdAt: string
  vehicles?: RemoteVehicle[]
}

export interface RemoteVehicle {
  id: number
  ownerId: number
  type: string
  brand: string | null
  plate: string
  capacityT: number
  volumeM3: number
  goodsAccepted: GoodsType[]
  available: boolean
  active: boolean
}

export interface RemoteOffer {
  id: number
  from: string
  to: string
  date: string
  totalCapacityT: number
  availableT: number
  goodsAccepted: GoodsType[]
  pricingMode: PricingMode
  price: number
  notes: string | null
  status: 'ouverte' | 'complete' | 'annulee' | 'terminee'
  transporter?: UserBrief
  vehicle?: { type: string; capacityT: number }
  createdAt: string
}

export interface RemoteRequest {
  id: number
  from: string
  to: string
  date: string
  goods: GoodsType
  weightT: number
  volumeM3: number | null
  parcels: number | null
  description: string | null
  requirements: string | null
  attachments: string[]
  contact: string
  status: OperationStatus
  poolingId: number | null
  client?: UserBrief
  createdAt: string
}

export interface RemoteReservation {
  id: number
  requestId: number
  offerId: number
  clientId: number
  transporterId: number
  weightT: number
  status: 'en_attente' | 'confirmee' | 'refusee' | 'annulee'
  offer?: RemoteOffer
  request?: RemoteRequest
  createdAt: string
}

export interface PoolingShare {
  requestId: number
  clientId: number
  weightT: number
  amount: number
  payable: number
  clientName?: string | null
}
export interface PoolingFinance { gross: number; ratePct: number; commission: number; netCarrier: number; bearer: 'transporteur' | 'clients' }

export interface RemotePooling {
  id: number
  offerId: number
  status: 'proposee' | 'validee' | 'confirmee' | 'refusee' | 'annulee'
  transportId: number | null
  finance: PoolingFinance
  shares?: PoolingShare[]
  offer?: RemoteOffer
  createdAt: string
  /** Détail transporteur (GET /carrier/poolings/{id}). */
  goods?: Array<{ clientName: string; goods: GoodsType; weightT: number; parcels: number | null; description: string | null; requirements: string | null; phone: string | null }>
}

export interface TrackingEvent { id: number; kind: 'statut' | 'position'; label: string; lat: number | null; lng: number | null; at: string }

export interface RemotePayment {
  id: number
  transportId: number
  requestId: number
  clientId: number
  amount: number
  method: 'mobile_money' | 'especes' | 'virement' | 'autre'
  status: PaymentStatus
  reference: string | null
  receiptNo: string | null
  confirmedAt: string | null
  createdAt: string
  transportRef?: string
  clientName?: string
}

export interface RemoteTransport {
  id: number
  ref: string
  status: OperationStatus
  poolingId: number
  offer: RemoteOffer
  events: TrackingEvent[]
  createdAt: string
  /** Visible par le client concerné. */
  share?: { requestId: number; weightT: number; amount: number; payable: number }
  payment?: RemotePayment | null
  carrierPhone?: string | null
  /** Visible par le transporteur et l'administrateur. */
  finance?: PoolingFinance
  clients?: Array<{ clientId: number; requestId: number; weightT: number; amount: number; payable: number; name: string; phone: string | null }>
  payments?: RemotePayment[]
}

export interface RemoteReview {
  id: number
  transportId: number
  fromId: number
  toId: number
  rating: number
  comment: string | null
  reported: boolean
  author?: UserBrief
  target?: UserBrief
  createdAt: string
}

export interface RemoteMessage { id: number; fromId: number; toId: number; text: string; createdAt: string }
export interface MessagePeer { id: number; displayName: string; role: Role }

export interface MatchResult {
  offer: RemoteOffer
  score: number
  criteria: Array<{ key: string; label: string; ok?: boolean }>
}

export interface Dashboard {
  clients: number; carriers: number; carriersToValidate: number
  vehicles: number; vehiclesAvailable: number
  requests: number; requestsSearching: number
  transportsConfirmed: number; transportsMoving: number; transportsDone: number
  cancelled: number; poolings: number; poolingsMulti: number
  transportAmount: number; commissionAcquired: number; commissionPlanned: number
  paymentsToReview: number; poolingsToValidate: number; fillRate: number
}

export interface Commissions {
  revenue: number; commissionAcquired: number; commissionPlanned: number
  paymentsConfirmed: number; paymentsWaiting: number; refunded: number
  ratePct: number; bearer: 'transporteur' | 'clients'
  rows: Array<{ transportRef: string; gross: number; ratePct: number; commission: number; netCarrier: number; status: 'prevue' | 'acquise' | 'annulee' }>
}

export interface Stats {
  done: number
  avgRating: number | null
  topRoutes: Array<{ route: string; count: number }>
  commissionByMonth: Record<string, number>
}

export interface AuditEntry { id: number; actor: string | null; action: string; detail: string; createdAt: string }

export interface PlatformSettings {
  commissionPct: number
  commissionBearer: 'transporteur' | 'clients'
  shareBasis: 'poids' | 'volume'
  cityRadiusKm: number
  dateToleranceDays: number
  paymentInstructions: string
}

export interface CarrierRevenue { netReceived: number; netPending: number; commissionPaid: number; monthly: Array<{ month: string; net: number }> }

/** Montants prévisualisés avant de proposer un regroupement (POST /admin/poolings/preview). */
export interface PoolingPreview { finance: PoolingFinance; shares: PoolingShare[] }
