import type { OperationStatus } from '@/types/operation'

export type Role = 'client' | 'transporteur' | 'admin'
export type AccountStatus = 'actif' | 'en_attente' | 'suspendu'

/** Types d'utilisateur : CDC §4 (cibles) et §7.1 (« type d'utilisateur »). */
export type UserType =
  | 'producteur' | 'cooperative' | 'commercant' | 'pme' | 'autre_client'
  | 'transporteur_independant' | 'entreprise_transport' | 'gestionnaire_flotte' | 'proprietaire_camion'
  | 'admin'

export type GoodsType = 'generales' | 'agricoles' | 'alimentaires' | 'materiaux' | 'equipements' | 'conteneur' | 'fragiles'

export interface User {
  id: string
  role: Role
  userType: UserType
  firstName: string
  lastName: string
  company?: string
  phone: string // format normalisé +229XXXXXXXXXX
  email?: string
  address: string
  city: string
  /** Numéro d'identification (IFU) — transporteurs, si applicable (CDC §8.1). */
  idNumber?: string
  documents: string[]
  /** Mot de passe : DÉMO UNIQUEMENT (empreinte simple). Le backend utilisera bcrypt/argon2. */
  passwordHash: string
  status: AccountStatus
  createdAt: string
}

export interface Vehicle {
  id: string
  ownerId: string
  type: string
  brand: string
  plate: string
  capacityT: number
  volumeM3: number
  goodsAccepted: GoodsType[]
  available: boolean
  active: boolean
}

export type PricingMode = 'tonne' | 'forfait'

export interface Offer {
  id: string
  transporterId: string
  vehicleId: string
  from: string
  to: string
  date: string // ISO yyyy-mm-dd
  totalCapacityT: number
  availableT: number
  goodsAccepted: GoodsType[]
  pricingMode: PricingMode
  /** FCFA par tonne (mode « tonne ») ou prix total du trajet (mode « forfait »). */
  price: number
  notes?: string
  status: 'ouverte' | 'complete' | 'annulee' | 'terminee'
  createdAt: string
}

export interface TransportRequest {
  id: string
  clientId: string
  from: string
  to: string
  date: string
  goods: GoodsType
  weightT: number
  volumeM3?: number
  parcels?: number
  description: string
  requirements?: string
  attachments: string[]
  contact: string
  status: OperationStatus
  poolingId?: string
  createdAt: string
}

export interface Reservation {
  id: string
  requestId: string
  offerId: string
  clientId: string
  transporterId: string
  weightT: number
  status: 'en_attente' | 'confirmee' | 'refusee' | 'annulee'
  createdAt: string
}

export interface PoolingShare {
  requestId: string
  clientId: string
  weightT: number
  /** Part du prix du transport (hors commission), FCFA. */
  amount: number
  /** Montant à payer par le client (inclut sa part de commission si supportée par les clients). */
  payable: number
}

export interface PoolingFinance {
  gross: number
  ratePct: number
  commission: number
  netCarrier: number
  bearer: 'transporteur' | 'clients'
}

export interface Pooling {
  id: string
  offerId: string
  requestIds: string[]
  /** proposee → validee (admin) → confirmee (transporteur) ; refusee / annulee. */
  status: 'proposee' | 'validee' | 'confirmee' | 'refusee' | 'annulee'
  shares: PoolingShare[]
  finance: PoolingFinance
  transportId?: string
  createdAt: string
}

export interface TrackingEvent {
  id: string
  transportId: string
  at: string
  kind: 'statut' | 'position'
  label: string
  lat?: number
  lng?: number
}

/** Opération de transport (identifiant unique MUT-AAAA-NNNNNN, CDC §15). */
export interface Transport {
  id: string
  ref: string
  poolingId: string
  offerId: string
  status: OperationStatus
  events: TrackingEvent[]
}

export type PaymentStatus = 'en_attente' | 'confirme' | 'echoue' | 'rembourse'

export interface Payment {
  id: string
  transportId: string
  clientId: string
  requestId: string
  amount: number
  method: 'mobile_money' | 'especes' | 'virement' | 'autre'
  /** Référence de transaction déclarée par le client (validation manuelle admin en V1, CDC §14). */
  reference?: string
  status: PaymentStatus
  createdAt: string
  confirmedAt?: string
  receiptNo?: string
}

export interface CommissionRecord {
  id: string
  transportId: string
  gross: number
  ratePct: number
  commission: number
  netCarrier: number
  status: 'prevue' | 'acquise' | 'annulee'
}

export interface Review {
  id: string
  transportId: string
  fromId: string
  toId: string
  rating: number
  comment?: string
  reported: boolean
  createdAt: string
}

export interface Notification {
  id: string
  userId: string
  title: string
  body: string
  link?: string
  read: boolean
  createdAt: string
}

export interface Message {
  id: string
  transportId?: string
  offerId?: string
  fromId: string
  toId: string
  text: string
  createdAt: string
}

export interface AuditLog {
  id: string
  actorId: string
  action: string
  detail: string
  createdAt: string
}

export interface Settings {
  commissionPct: number // 5 à 10 (CDC §13)
  commissionBearer: 'transporteur' | 'clients'
  shareBasis: 'poids' | 'volume'
  cityRadiusKm: number
  dateToleranceDays: number
  /** Consignes de paiement Mobile Money affichées au client (numéro MUTLOG à renseigner). */
  paymentInstructions: string
}
