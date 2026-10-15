import type {
  AuditLog, CommissionRecord, Message, Notification, Offer, Payment, Pooling, Reservation, Review,
  Settings, Transport, TransportRequest, User, Vehicle,
} from '@/domain/types'

export interface Db {
  version: 1
  users: User[]
  vehicles: Vehicle[]
  offers: Offer[]
  requests: TransportRequest[]
  reservations: Reservation[]
  poolings: Pooling[]
  transports: Transport[]
  payments: Payment[]
  commissions: CommissionRecord[]
  reviews: Review[]
  notifications: Notification[]
  messages: Message[]
  audit: AuditLog[]
  settings: Settings
  /** Codes de récupération de compte (démo : affichés à l'écran ; en production : SMS / e-mail). */
  resets: { phone: string; code: string; expiresAt: number }[]
  counters: { transport: number; receipt: number }
  session: { userId: string | null }
}

export type Result<T = void> = { ok: true; value: T } | { ok: false; error: string }
export const ok = <T,>(value: T): Result<T> => ({ ok: true, value })
export const fail = (error: string): Result<never> => ({ ok: false, error })
